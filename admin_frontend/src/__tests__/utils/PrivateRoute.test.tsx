import { render, screen } from '@testing-library/react';
import AuthContext from '../../contexts/AuthContext';

describe('PrivateRoute', () => {
  it('shows loading state when loading', async () => {
    const { default: PrivateRoute } = await import('../../utils/PrivateRoute');

    render(
      <AuthContext.Provider
        value={{
          user: null,
          isAuthenticated: false,
          loading: true,
          refreshSession: async () => {},
          logout: async () => {},
        }}
      >
        <PrivateRoute>
          <div>Secret</div>
        </PrivateRoute>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Checking session...')).toBeInTheDocument();
  });

  it('does not render children when not authenticated', async () => {
    const { default: PrivateRoute } = await import('../../utils/PrivateRoute');
    render(
      <AuthContext.Provider
        value={{
          user: null,
          isAuthenticated: false,
          loading: false,
          refreshSession: async () => {},
          logout: async () => {},
        }}
      >
        <PrivateRoute>
          <div>Secret</div>
        </PrivateRoute>
      </AuthContext.Provider>
    );
    expect(screen.queryByText('Secret')).toBeNull();
  });

  it('renders children when authenticated', async () => {
    const { default: PrivateRoute } = await import('../../utils/PrivateRoute');

    render(
      <AuthContext.Provider
        value={{
          user: { email: 'a@b.com' } as any,
          isAuthenticated: true,
          loading: false,
          refreshSession: async () => {},
          logout: async () => {},
        }}
      >
        <PrivateRoute>
          <div>Secret</div>
        </PrivateRoute>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Secret')).toBeInTheDocument();
  });
});
