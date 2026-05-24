import { render, screen, waitFor } from '@testing-library/react';
import RequireAuth from '@/features/auth/RequireAuth';
import { AuthProvider } from '@/features/auth/AuthContext';

const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
}));

function renderGuarded() {
  return render(
    <AuthProvider>
      <RequireAuth>
        <p>Protected content</p>
      </RequireAuth>
    </AuthProvider>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    window.localStorage.clear();
    replace.mockClear();
  });

  it('redirects to /login when there is no token', async () => {
    renderGuarded();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.getByText(/redirecting to login/i)).toBeInTheDocument();
  });

  it('renders the protected content when a token is present', async () => {
    window.localStorage.setItem('token', 'a-token');
    window.localStorage.setItem('user', JSON.stringify({ id: 1, email: 'a@b.c' }));

    renderGuarded();

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
