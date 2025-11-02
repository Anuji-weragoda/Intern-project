import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../../contexts/AuthContext';
import authService from '../../services/authService';

function Probe() {
  const { user, isAuthenticated, loading } = useAuthContext();
  return (
    <div>
      <div>loading:{String(loading)}</div>
      <div>auth:{String(isAuthenticated)}</div>
      <div>user:{user ? user.email || 'yes' : 'no'}</div>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('initially loads session and sets user when present', async () => {
    jest.spyOn(authService, 'getSession').mockResolvedValue({ email: 'a@b.com' } as any);

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(screen.getByText(/loading:true/)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/loading:false/)).toBeInTheDocument());
    expect(screen.getByText(/auth:true/)).toBeInTheDocument();
    expect(screen.getByText(/user:a@b.com/)).toBeInTheDocument();
  });

  it('sets unauthenticated when no session', async () => {
    jest.spyOn(authService, 'getSession').mockResolvedValue(null as any);

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByText(/loading:false/)).toBeInTheDocument());
    expect(screen.getByText(/auth:false/)).toBeInTheDocument();
    expect(screen.getByText(/user:no/)).toBeInTheDocument();
  });
});
