import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

// Extra branches for Dashboard: formatTimeAgo variants, formatDate 'Never',
// unknown role badge and unknown event icon fallback.
describe('Dashboard extra branches', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    document.cookie = '';
    global.fetch = originalFetch as any;
    // Freeze time to a fixed point so relative time strings are deterministic
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-02T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('renders recent activities with various time ranges and unknown mappings', async () => {
    document.cookie = 'jwt_token=valid.long.jwt; path=/';

    const user = {
      email: 'user@corp.com',
      displayName: 'User',
      username: 'user',
      roles: ['GUEST'], // unknown role => default badge color path
      isActive: true,
      mfaEnabled: false,
      createdAt: '2025-01-01T00:00:00Z',
      lastLoginAt: null, // triggers formatDate "Never"
    };

    // Create activities around the frozen now (2025-11-02T12:00:00Z)
    const justNow = '2025-11-02T12:00:00Z';
    const thirtyMinsAgo = '2025-11-02T11:30:00Z';
    const threeHoursAgo = '2025-11-02T09:00:00Z';
    const twoDaysAgo = '2025-10-31T12:00:00Z';

    const auditData = [
      { email: 'user@corp.com', eventType: 'UNKNOWN_EVENT', createdAt: justNow, success: true }, // default icon path
      { email: 'user@corp.com', eventType: 'LOGIN', createdAt: thirtyMinsAgo, success: true },
      { email: 'user@corp.com', eventType: 'UPDATE', createdAt: threeHoursAgo, success: true },
      { email: 'user@corp.com', eventType: 'DELETE', createdAt: twoDaysAgo, success: false },
    ];

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/me')) return { ok: true, status: 200, json: async () => user } as any;
      if (url.endsWith('/api/v1/admin/audit-log')) return { ok: true, status: 200, json: async () => auditData } as any;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: Dashboard } = await import('../../pages/Dashboard');
    render(<Dashboard />);

    // Welcome header
    expect(await screen.findByText(/Welcome back/i)).toBeInTheDocument();
    // Last Login uses formatDate('Never')
    expect(screen.getByText(/Last Login/i).parentElement).toHaveTextContent('Never');

    // Recent Activity list: ensure time phrases appear
    // "Just now", "minutes ago", "hours ago", "days ago"
    expect(await screen.findByText(/Just now/i)).toBeInTheDocument();
    expect(screen.getByText(/minute/i)).toBeInTheDocument();
    expect(screen.getByText(/hour/i)).toBeInTheDocument();
    expect(screen.getByText(/day/i)).toBeInTheDocument();
  });
});
