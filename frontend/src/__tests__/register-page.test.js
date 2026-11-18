import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '@/app/register/page';
import { confirmEmail, register } from '@/features/auth/api';

jest.mock('@/features/auth/api', () => ({
  register: jest.fn(),
  confirmEmail: jest.fn(),
  login: jest.fn(),
  refreshAuthToken: jest.fn(),
}));

describe('Register page (mocked API)', () => {
  beforeEach(() => {
    register.mockReset();
    confirmEmail.mockReset();
  });

  it('registers a new Client user and allows one-click portfolio confirmation', async () => {
    register.mockResolvedValue({
      newUser: { id: 10, email: 'newclient@example.com', type: 'Client', confirmed: false },
      confirmationToken: 'tok-123',
      confirmationUrl: 'http://localhost:3000/confirm-email/tok-123',
    });
    confirmEmail.mockResolvedValue({ message: 'Email confirmed successfully.', confirmed: true });

    render(<RegisterPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/name/i), 'New Client');
    await user.type(screen.getByLabelText(/email/i), 'newclient@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Client@123');
    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(await screen.findByText(/account created/i)).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith({
      name: 'New Client',
      email: 'newclient@example.com',
      password: 'Client@123',
      type: 'Client',
    });

    await user.click(screen.getByRole('button', { name: /confirm email now/i }));
    expect(await screen.findByText(/account confirmed/i)).toBeInTheDocument();
    expect(confirmEmail).toHaveBeenCalledWith('tok-123');
  });
});
