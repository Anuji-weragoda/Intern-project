import { render, screen, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '../../contexts/AuthContext';
import authService from '../../services/authService';

describe('Home page', () => {
  it('shows Sign In when unauthenticated and triggers login redirect on click', async () => {
    jest.spyOn(authService, 'getSession').mockResolvedValue(null as any);

    const { default: Home } = await import('../../pages/Home');

    render(
      <AuthProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AuthProvider>
    );

    const btn = await screen.findByRole('button', { name: /^sign in$/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
  });

  it('shows Go to Dashboard when authenticated', async () => {
    jest.spyOn(authService, 'getSession').mockResolvedValue({ displayName: 'Ada' } as any);

    const { default: Home } = await import('../../pages/Home');

    render(
      <AuthProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findAllByText(/Go to Dashboard/i)).toBeTruthy();
  });
});
