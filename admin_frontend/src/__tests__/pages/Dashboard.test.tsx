import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { jest } from '@jest/globals';

// ESM note: import inside tests when needed to apply mocks first

describe('Dashboard page', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    document.cookie = '';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('shows error when no token (neither cookie nor URL)', async () => {
    const { default: Dashboard } = await import('../../pages/Dashboard');
    render(<Dashboard />);

    // Loading first
    expect(screen.getByText(/Loading dashboard/i)).toBeInTheDocument();

    // Then error
    expect(await screen.findByText(/Error Loading Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/No JWT token found/i)).toBeInTheDocument();

    // Clicking Try Again should call fetchDashboardData again (but still error due to no token)
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(await screen.findByText(/Error Loading Dashboard/i)).toBeInTheDocument();
  });

  it('renders user info and audit stats on success; tolerates audit logs failure', async () => {
    // Provide token by cookie
    document.cookie = 'jwt_token=very.long.fake.token.value; path=/';

    const user = {
      email: 'demo@corp.com',
      username: 'demo',
      displayName: 'Demo User',
      roles: ['USER'],
      isActive: true,
      mfaEnabled: false,
      createdAt: '2024-10-10T10:00:00Z',
      lastLoginAt: '2025-10-31T12:30:00Z',
      loginCount: 42,
    };

    const auditData = [
      { email: 'demo@corp.com', eventType: 'LOGIN', createdAt: '2025-10-31T12:30:00Z', success: true },
      { email: 'demo@corp.com', eventType: 'LOGIN', createdAt: '2025-10-30T11:20:00Z', success: false },
      { email: 'other@corp.com', eventType: 'UPDATE', createdAt: '2025-10-29T12:30:00Z', success: true },
    ];

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/me')) {
        return { ok: true, status: 200, json: async () => user } as any;
      }
      if (url.endsWith('/api/v1/admin/audit-log')) {
        // First time succeed, second time fail to hit inner catch path
        if ((fetchMock as any).__auditOnce) {
          return { ok: false, status: 500, text: async () => 'boom' } as any;
        }
        (fetchMock as any).__auditOnce = true;
        return { ok: true, status: 200, json: async () => auditData } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;
    global.fetch = fetchMock;

    const { default: Dashboard } = await import('../../pages/Dashboard');
    render(<Dashboard />);

    // Wait for Welcome header
    expect(await screen.findByText(/Welcome back/i)).toBeInTheDocument();
  // Profile info (scope within the Profile Information card to avoid duplicates)
  expect(screen.getByText('Demo User')).toBeInTheDocument();
  // The email value appears in the same row as the 'Email' label in the profile card
  const emailRow = screen.getByText('Email').closest('div')!;
  expect(within(emailRow).getByText('demo@corp.com')).toBeInTheDocument();
    // Audit cards derived from auditData
    expect(screen.getByText(/Total Audit Logs/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Trigger Try Again to refetch and hit audit failure branch safely
    const tryAgain = screen.queryByRole('button', { name: /Try Again/i });
    if (tryAgain) {
      fireEvent.click(tryAgain);
    } else {
      // Force rerender by re-import to exercise audit failure branch
      const { default: Dashboard2 } = await import('../../pages/Dashboard');
      render(<Dashboard2 />);
    }

    // Ensure still shows some UI (no crash)
    await waitFor(() => expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument());
  });
});
