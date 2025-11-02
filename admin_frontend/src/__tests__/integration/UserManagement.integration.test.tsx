import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('UserManagement integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // ensure clean URL and a JWT cookie for page's token finder
    window.history.replaceState({}, '', '/');
    document.cookie = 'jwt_token=fake.jwt.token.value.with.length; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('renders users table with API data when authenticated ADMIN', async () => {
    // Fake authenticated user returned by authService
    const fakeUser = {
      email: 'admin@example.com',
      username: 'admin',
      displayName: 'Admin User',
      roles: ['ADMIN'],
      isActive: true,
      emailVerified: true,
    };

    // Spy on authService.getSession to return authenticated user
    const auth = await import('../../services/authService');
    const sessionSpy = jest
      .spyOn((auth as any).default, 'getSession')
      .mockResolvedValue(fakeUser as any);

    // Mock roles+users endpoints consumed by UserManagement
    const pageResponse = {
      content: [
        { id: 1, email: 'jane@corp.com', username: 'jane', isActive: true, roles: ['USER'], createdAt: '2025-01-01T00:00:00Z', lastLoginAt: '2025-11-01T00:00:00Z' },
        { id: 2, email: 'john@corp.com', username: 'john', isActive: false, roles: ['ADMIN','USER'], createdAt: '2025-01-02T00:00:00Z', lastLoginAt: null },
      ],
      pageable: { pageNumber: 0, pageSize: 20 },
      totalElements: 2,
      totalPages: 1,
      last: true,
      first: true,
      number: 0,
      size: 20,
      empty: false,
    };

    const rolesResponse = [
      { roleName: 'ADMIN' },
      { roleName: 'HR' },
      { roleName: 'USER' },
      { roleName: 'ML1' },
      { roleName: 'ML2' },
      { roleName: 'ML3' },
    ];

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/v1/me')) {
        return { ok: true, status: 200, json: async () => fakeUser } as any;
      }
      if (url.includes('/api/v1/admin/roles')) {
        return { ok: true, status: 200, json: async () => rolesResponse } as any;
      }
      if (url.includes('/api/v1/admin/users')) {
        return { ok: true, status: 200, json: async () => pageResponse } as any;
      }

      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    // Navigate straight to User Management
    window.history.pushState({}, '', '/admin/users');

    const { default: App } = await import('../../App');
    const { AuthProvider } = await import('../../contexts/AuthContext');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Header should be visible
    const heading = await screen.findByText(/User Management/i, undefined, { timeout: 5000 });
    expect(heading).toBeInTheDocument();

    // Table content should include our users
    expect(await screen.findByText('jane@corp.com')).toBeInTheDocument();
    expect(await screen.findByText('john@corp.com')).toBeInTheDocument();

    // Some role labels will render (mapped by UI from backend role list)
    // We only check that at least one role label appears in the document.
    expect(screen.getAllByText(/Admin|User|HR|Management Level/i).length).toBeGreaterThan(0);

    sessionSpy.mockRestore();
  });
});
