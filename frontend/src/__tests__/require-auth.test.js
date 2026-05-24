import { render, screen, waitFor } from '@testing-library/react';
import RequireAuth from '@/features/auth/RequireAuth';
import { AuthProvider } from '@/features/auth/AuthContext';

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace, push: jest.fn(), prefetch: jest.fn() };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

function renderProtected() {
  return render(
    <AuthProvider>
      <RequireAuth>
        <p>secret area</p>
      </RequireAuth>
    </AuthProvider>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockReplace.mockClear();
  });

  it('redirects unauthenticated users to /login and hides the content', async () => {
    renderProtected();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('secret area')).not.toBeInTheDocument();
  });

  it('renders the protected content when a token is stored', async () => {
    window.localStorage.setItem('ecommerce.token', 'fake-token');
    window.localStorage.setItem('ecommerce.user', JSON.stringify({ id: 1, email: 'admin@test.local' }));

    renderProtected();

    expect(await screen.findByText('secret area')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
