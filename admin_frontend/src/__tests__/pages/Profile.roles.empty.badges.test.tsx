import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

describe('Profile empty roles and status badge branches', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, '', '/profile');
    document.cookie = 'jwt_token=valid.long.jwt; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('renders with empty roles and shows status badges for inactive and MFA disabled', async () => {
    const profile = {
      email: 'user@example.com',
      displayName: 'User',
      username: 'user',
      roles: [], // empty => "No roles assigned"
      createdAt: '2025-01-01T00:00:00Z',
      lastLoginAt: null,
      isActive: false,
      emailVerified: false,
      mfaEnabled: false,
    };

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/me')) return { ok: true, status: 200, json: async () => profile } as any;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: Profile } = await import('../../pages/Profile');
    render(<Profile />);

    expect(await screen.findByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText(/No roles assigned/i)).toBeInTheDocument();
  // Status badges text (component shows 'Not Verified' next to Email Status)
  expect(screen.getByText(/Not Verified/i)).toBeInTheDocument();
    expect(screen.getByText(/Inactive/i)).toBeInTheDocument();
    expect(screen.getByText(/Disabled/i)).toBeInTheDocument();
  });
});
