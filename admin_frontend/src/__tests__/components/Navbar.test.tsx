import { jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthContext from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';

describe('Navbar', () => {
  it('shows Sign in when not authenticated', async () => {
    const value = { user: null, isAuthenticated: false, loading: false, refreshSession: jest.fn(), logout: jest.fn() } as any;
    render(
      <MemoryRouter>
        <AuthContext.Provider value={value}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const signIn = screen.getAllByText('Sign in')[0] as HTMLAnchorElement;
    expect(signIn).toBeInTheDocument();
    expect(signIn.getAttribute('href')).toContain('/oauth2/authorization/cognito');
  });

  it('shows nav links when authenticated', async () => {
    const value = { user: { email: 'user@example.com' }, isAuthenticated: true, loading: false, refreshSession: jest.fn(), logout: jest.fn() } as any;
    render(
      <MemoryRouter initialEntries={[{ pathname: '/dashboard' }] as any}>
        <AuthContext.Provider value={value}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Users' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Audit Log' }).length).toBeGreaterThan(0);
  });

  it('toggles mobile menu', async () => {
    const value = { user: null, isAuthenticated: false, loading: false, refreshSession: jest.fn(), logout: jest.fn() } as any;
    render(
      <MemoryRouter>
        <AuthContext.Provider value={value}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const toggle = screen.getByRole('button', { name: /open main menu/i });
    fireEvent.click(toggle);
    expect(toggle).toBeInTheDocument();
  });
});
