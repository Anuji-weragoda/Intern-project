import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

// Use ESM-friendly module mocking; import after mocks in each test

describe('App integration', () => {
  const originalLocation = window.location;
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Reset URL and cookies for each test
    window.history.replaceState({}, '', '/');
    document.cookie = 'jwt_token=; Max-Age=0; path=/';

    // Reset fetch
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    // Restore globals
    global.fetch = originalFetch as any;
    // Some environments require reassigning location back
    // @ts-expect-error restore readonly
    window.location = originalLocation;
  });

  it('unauthenticated visiting a protected route shows sign-in affordance and not the protected content', async () => {
    await jest.unstable_mockModule('../../services/authService', () => {
      const getSession = async () => null as any;
      const logout = async () => {};
      return {
        __esModule: true,
        default: { getSession, logout },
        getSession,
        logout,
      };
    });

    // Start on a protected route
    window.history.pushState({}, '', '/dashboard');

    const { default: App } = await import('../../App');
    const { AuthProvider } = await import('../../contexts/AuthContext');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Navbar should render with a Sign in link
    const signInLinks = await screen.findAllByRole('link', { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signInLinks[0]).toHaveAttribute('href', expect.stringContaining('/oauth2/authorization/cognito'));

    // Protected dashboard content should not be present
    expect(screen.queryByText(/Welcome back,/i)).toBeNull();
  });

  it('authenticates, navigates from "/" to "/dashboard", and renders Dashboard content', async () => {
    const fakeUser = {
      email: 'jane.doe@example.com',
      username: 'janedoe',
      displayName: 'Jane Doe',
      roles: ['ADMIN'],
      isActive: true,
      emailVerified: true,
      mfaEnabled: false,
      createdAt: '2025-01-01T10:00:00Z',
      lastLoginAt: '2025-11-01T12:00:00Z',
      loginCount: 3,
    };

    // Provide cookie JWT for pages that read directly from cookies
    document.cookie = 'jwt_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9; path=/';

    // Spy on authService to report an authenticated session
    const auth = await import('../../services/authService');
    const sessionSpy = jest
      .spyOn((auth as any).default, 'getSession')
      .mockResolvedValue(fakeUser as any);

    // Mock global fetch for Dashboard and any other API calls
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      // AuthProvider session probes via apiFetch
      if (url.includes('/api/v1/me/session') || url.endsWith('/api/v1/me')) {
        return { ok: true, status: 200, json: async () => fakeUser } as any;
      }

      if (url.includes('/api/v1/admin/audit-log')) {
        const logs = [
          { email: 'jane.doe@example.com', eventType: 'LOGIN', success: true, createdAt: new Date().toISOString() },
          { email: 'john.smith@example.com', eventType: 'LOGIN', success: false, createdAt: new Date().toISOString() },
        ];
        return { ok: true, status: 200, json: async () => logs } as any;
      }

      // Fallback OK empty JSON
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    // Start at home
    window.history.pushState({}, '', '/');

  const { default: App } = await import('../../App');
  const { AuthProvider } = await import('../../contexts/AuthContext');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Dashboard should render a known section when authenticated
    const profileHeading = await screen.findByText(/Profile Information/i, undefined, { timeout: 5000 });
    expect(profileHeading).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard');
    
  // A quick sanity on some dashboard content derived from user
  expect(screen.getAllByText(fakeUser.email).length).toBeGreaterThan(0);

    sessionSpy.mockRestore();
  });
});
