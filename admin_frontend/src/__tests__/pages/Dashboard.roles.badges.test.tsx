import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

describe('Dashboard known role badges branch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    document.cookie = 'jwt_token=valid.long.jwt; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('renders ADMIN and USER role badges to exercise getRoleBadgeColor branches', async () => {
    const user = {
      email: 'a@corp.com',
      username: 'a',
      displayName: 'A',
      roles: ['ADMIN', 'USER'],
      isActive: true,
      mfaEnabled: true,
      createdAt: '2025-01-01T00:00:00Z',
      lastLoginAt: '2025-10-31T12:00:00Z',
    };

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/me')) return { ok: true, status: 200, json: async () => user } as any;
      if (url.endsWith('/api/v1/admin/audit-log')) return { ok: true, status: 200, json: async () => [] } as any;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;
    global.fetch = fetchMock;

    const { default: Dashboard } = await import('../../pages/Dashboard');
    render(<Dashboard />);

    // Wait for page then assert both role labels appear as badges
    expect(await screen.findByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getAllByText('ADMIN').length).toBeGreaterThan(0);
    expect(screen.getAllByText('USER').length).toBeGreaterThan(0);
  });
});
