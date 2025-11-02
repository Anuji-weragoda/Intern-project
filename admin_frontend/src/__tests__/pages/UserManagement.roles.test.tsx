import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

describe('UserManagement roles and error paths', () => {
  const originalFetch = global.fetch;
  const baseUser = (overrides: Partial<any> = {}) => ({
    id: 1,
    email: 'jane@corp.com',
    username: 'jane',
    isActive: true,
    roles: ['USER'],
    createdAt: '2025-01-01T00:00:00Z',
    lastLoginAt: '2025-11-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    window.history.replaceState({}, '', '/admin/users');
    document.cookie = 'jwt_token=fake.jwt.token.value.with.length; path=/';
    global.fetch = originalFetch as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('filters by role, opens details and role modals, updates roles via PATCH', async () => {
    // Authenticated context not strictly required when importing the page directly
    const pageResponse = {
      content: [baseUser(), baseUser({ id: 2, email: 'john@corp.com', username: 'john', roles: ['ADMIN','USER'], isActive: false })],
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
    ];

    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/roles')) return { ok: true, status: 200, json: async () => rolesResponse } as any;
      if (url.includes('/api/v1/admin/users') && (!init || init.method === 'GET')) return { ok: true, status: 200, json: async () => pageResponse } as any;
      if (url.includes('/api/v1/admin/users/1/roles') && init?.method === 'PATCH') return { ok: true, status: 200, json: async () => ({}) } as any;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;
    global.fetch = fetchMock;

    const { default: UserManagement } = await import('../../pages/UserManagement');
    render(<UserManagement />);

    // Wait for users
    expect(await screen.findByText(/User Management/i)).toBeInTheDocument();
    expect(await screen.findByText('jane@corp.com')).toBeInTheDocument();
    expect(await screen.findByText('john@corp.com')).toBeInTheDocument();

    // Filter by role: ADMIN should narrow results
  const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });
    expect(await screen.findByText('john@corp.com')).toBeInTheDocument();
    expect(screen.queryByText('jane@corp.com')).not.toBeInTheDocument();

    // Clear filters
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    // Open details modal by clicking row
    fireEvent.click(screen.getByText('jane@corp.com'));
    expect(await screen.findByText(/User Information/i)).toBeInTheDocument();

    // From details modal, open Manage Roles
    fireEvent.click(screen.getAllByRole('button', { name: /Manage Roles/i })[0]);
  expect(await screen.findByRole('heading', { name: 'Manage User Roles' })).toBeInTheDocument();

    // Toggle role ADMIN and USER selections
    const adminOption = screen.getByRole('button', { name: /Admin/i });
    fireEvent.click(adminOption);
    const userOption = screen.getByRole('button', { name: /User/i });
    fireEvent.click(userOption); // deselect User (was initially selected)

    // Submit update
    window.alert = jest.fn();
    const updateBtn = screen.getByRole('button', { name: /Update Roles/i });
    fireEvent.click(updateBtn);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/admin\/users\/1\/roles/),
      expect.objectContaining({ method: 'PATCH' })
    ));
  });

  it('shows error when no token found', async () => {
    // Clear cookie so getJWT fails
    document.cookie = 'jwt_token=; Max-Age=0; path=/';
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })) as any;

    const { default: UserManagement } = await import('../../pages/UserManagement');
    render(<UserManagement />);

    expect(await screen.findByText(/Authentication Error/i)).toBeInTheDocument();
  });

  it('handles 401 and redirects after timeout', async () => {
  document.cookie = 'jwt_token=fake.jwt.token.value.with.length; path=/';
    const fetch401 = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/users')) return { ok: false, status: 401, text: async () => 'unauthorized' } as any;
      if (url.includes('/api/v1/admin/roles')) return { ok: true, status: 200, json: async () => [] } as any;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;
    global.fetch = fetch401;

    const { default: UserManagement } = await import('../../pages/UserManagement');
    render(<UserManagement />);

    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
    // Advance timers to trigger redirect side-effect
    jest.runOnlyPendingTimers();
  });

  it('handles 403 forbidden', async () => {
    document.cookie = 'jwt_token=fake.jwt.token.value.with.length; path=/';
    const fetch403 = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/users')) return { ok: false, status: 403, text: async () => 'forbidden' } as any;
      if (url.includes('/api/v1/admin/roles')) return { ok: true, status: 200, json: async () => [] } as any;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;
    global.fetch = fetch403;

    const { default: UserManagement } = await import('../../pages/UserManagement');
    render(<UserManagement />);

    expect(await screen.findByText(/Access denied/)).toBeInTheDocument();
  });
});
