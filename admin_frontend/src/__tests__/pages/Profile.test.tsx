import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

describe('Profile page', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // reset URL and cookies
    window.history.replaceState({}, '', '/profile');
    document.cookie = 'jwt_token=; Max-Age=0; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('renders profile information when token present', async () => {
    document.cookie = 'jwt_token=fake.token.value; path=/';

    const profile = {
      email: 'user@example.com',
      displayName: 'Test User',
      username: 'testuser',
      roles: ['USER'],
      createdAt: '2025-01-01T00:00:00Z',
      lastLoginAt: '2025-11-01T00:00:00Z'
    };

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/me')) {
        return { ok: true, status: 200, json: async () => profile } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: Profile } = await import('../../pages/Profile');
    render(<Profile />);

    expect(await screen.findByText('My Profile')).toBeInTheDocument();
    expect(await screen.findByText('Profile Information')).toBeInTheDocument();
    expect(screen.getAllByText(profile.email).length).toBeGreaterThan(0);
  });

  it('shows error when no token present', async () => {
    const { default: Profile } = await import('../../pages/Profile');
    render(<Profile />);

    expect(await screen.findByText(/Error Loading Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/No JWT token found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });
});
