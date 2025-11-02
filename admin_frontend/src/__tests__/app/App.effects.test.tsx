import { render, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import AuthContext from '../../contexts/AuthContext';
import App from '../../App';

describe('App effects', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('removes ?jwt from URL and calls refreshSession', async () => {
    window.history.replaceState({}, '', '/?jwt=test.token');

    const refreshSession = jest.fn();
    const value = {
      user: null,
      isAuthenticated: false,
      loading: false,
      refreshSession,
      logout: jest.fn(),
    } as any;

    render(
      <AuthContext.Provider value={value}>
        <App />
      </AuthContext.Provider>
    );

    await waitFor(() => expect(refreshSession).toHaveBeenCalled());
    expect(window.location.search).toBe('');
  });

  it('navigates to /dashboard from / when already authenticated', async () => {
    window.history.replaceState({}, '', '/');

    const value = {
      user: { email: 'auth@example.com' },
      isAuthenticated: true,
      loading: false,
      refreshSession: jest.fn(),
      logout: jest.fn(),
    } as any;

    render(
      <AuthContext.Provider value={value}>
        <App />
      </AuthContext.Provider>
    );

    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
  });
});
