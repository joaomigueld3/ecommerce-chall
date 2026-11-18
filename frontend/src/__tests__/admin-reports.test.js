import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsAdminPage from '@/app/admin/reports/page';
import Providers from '@/app/providers';
import { generateReport, getReports } from '@/features/reports/api';

const mockRouter = { replace: jest.fn(), push: jest.fn(), prefetch: jest.fn() };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/features/reports/api', () => ({
  getReports: jest.fn(),
  generateReport: jest.fn(),
  deleteReport: jest.fn(),
  downloadReportCsv: jest.fn(),
}));

describe('Admin Reports page & RBAC guard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getReports.mockReset();
    generateReport.mockReset();
  });

  it('denies access to Client users via RequireRole', async () => {
    window.localStorage.setItem('ecommerce.token', 'client-token');
    window.localStorage.setItem(
      'ecommerce.user',
      JSON.stringify({ id: 2, email: 'client@test.local', type: 'Client' }),
    );

    render(
      <Providers>
        <ReportsAdminPage />
      </Providers>,
    );

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    expect(getReports).not.toHaveBeenCalled();
  });

  it('generates and lists sales reports for Admin users', async () => {
    window.localStorage.setItem('ecommerce.token', 'admin-token');
    window.localStorage.setItem(
      'ecommerce.user',
      JSON.stringify({ id: 1, email: 'admin@test.local', type: 'Admin' }),
    );

    getReports
      .mockResolvedValueOnce({ allReports: [] })
      .mockResolvedValueOnce({
        allReports: [
          {
            reportId: 1,
            periodStart: '2026-11-01T00:00:00.000Z',
            periodEnd: '2026-11-16T23:59:59.999Z',
            productsSold: 4,
            totalSales: '400.00',
            filePath: 'storage/reports/sales-report-1.csv',
          },
        ],
      });

    generateReport.mockResolvedValue({
      message: 'Sales report generated successfully.',
      items: [
        { productId: 1, productName: 'Keyboard', category: 'Peripherals', quantitySold: 4, revenue: '400.00' },
      ],
    });

    render(
      <Providers>
        <ReportsAdminPage />
      </Providers>,
    );

    expect(await screen.findByText(/no reports generated yet/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /generate report/i }));

    expect(generateReport).toHaveBeenCalled();
    expect(await screen.findByText(/Keyboard/i)).toBeInTheDocument();
    expect(await screen.findByText(/storage\/reports\/sales-report-1\.csv/i)).toBeInTheDocument();
  });
});
