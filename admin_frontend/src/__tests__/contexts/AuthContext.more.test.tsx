import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { AuthProvider, useAuthContext } from '../../contexts/AuthContext';
import authService from '../../services/authService';

function Probe() {
  const { loading, isAuthenticated, logout } = useAuthContext();
  // invoke logout for coverage of doLogout try/catch
  if (!loading) {
    // Fire and forget
    logout();
  }
  return (
    <div>
      <div>loading:{String(loading)}</div>
      <div>auth:{String(isAuthenticated)}</div>
    </div>
  );
}

describe('AuthContext extra coverage', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('handles getSession throwing and logout path', async () => {
    jest.spyOn(authService, 'getSession').mockRejectedValue(new Error('boom'));
    jest.spyOn(authService, 'logout').mockResolvedValue();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText(/loading:false/)).toBeInTheDocument());
    expect(screen.getByText(/auth:false/)).toBeInTheDocument();
  });
});
