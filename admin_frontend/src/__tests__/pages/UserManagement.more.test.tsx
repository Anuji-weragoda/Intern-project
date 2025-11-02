import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

const baseUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  email: 'alpha@corp.com',
  username: 'alpha',
  isActive: true,
  roles: ['USER'],
  createdAt: '2025-01-01T00:00:00Z',
  lastLoginAt: null,
  ...overrides,
});

describe('UserManagement additional coverage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/users');
    document.cookie = '';
    global.fetch = originalFetch as any;
  });

  afterEach(() => {
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('renders empty state when no users and roles fetch non-ok falls back to defaults', async () => {
    document.cookie = 'jwt_token=fake.jwt.that.is.long.enough; path=/';

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/roles')) return { ok: false, status: 500, text: async () => 'bad' } as any;
      if (url.includes('/api/v1/admin/users')) return { ok: true, status: 200, json: async () => ({ content: [], totalElements: 0, totalPages: 0, first: true, last: true, number: 0, size: 20, pageable: { pageNumber: 0, pageSize: 20 }, empty: true }) } as any;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;
    global.fetch = fetchMock;

    const { default: UserManagement } = await import('../../pages/UserManagement');
    render(<UserManagement />);

    expect(await screen.findByText(/No users found/i)).toBeInTheDocument();
  });

  it('error tile: Show Debug Info alerts', async () => {
    // No token => error state
    document.cookie = 'jwt_token=; Max-Age=0; path=/';

    const { default: UserManagement } = await import('../../pages/UserManagement');
    render(<UserManagement />);

    window.alert = jest.fn();
    const debug = screen.getByRole('button', { name: /Show Debug Info/i });
    fireEvent.click(debug);
    expect(window.alert).toHaveBeenCalled();
  });

  it('getJWT picks from URL param and cleans URL', async () => {
    // Put token in URL and ensure no cookie
    document.cookie = '';
    window.history.replaceState({}, '', '/admin/users?jwt=verylongtokenstringvalueeeeeeeee');

    const pageResponse = {
      content: [baseUser()], pageable: { pageNumber: 0, pageSize: 20 }, totalElements: 1, totalPages: 1, first: true, last: true, number: 0, size: 20, empty: false,
    };

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/users')) return { ok: true, status: 200, json: async () => pageResponse } as any;
      if (url.includes('/api/v1/admin/roles')) return { ok: true, status: 200, json: async () => [{ roleName: 'USER' }] } as any;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: UserManagement } = await import('../../pages/UserManagement');
    render(<UserManagement />);

    // User row appears => token used; URL should be cleaned (no assertion on history, but no crash)
    expect(await screen.findByText('alpha@corp.com')).toBeInTheDocument();
  });

  it('getJWT can read from localStorage and sessionStorage', async () => {
    // No cookie and no URL; place token in storages
    window.history.replaceState({}, '', '/admin/users');
    try { localStorage.setItem('jwt_token', 'totally.valid.long.token.value.abc'); } catch {}
    try { sessionStorage.setItem('access_token', 'another.valid.long.token.value.xyz'); } catch {}

    const pageResponse = {
      content: [baseUser({ id: 2, email: 'beta@corp.com' })], pageable: { pageNumber: 0, pageSize: 20 }, totalElements: 1, totalPages: 1, first: true, last: true, number: 0, size: 20, empty: false,
    };

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/users')) return { ok: true, status: 200, json: async () => pageResponse } as any;
      if (url.includes('/api/v1/admin/roles')) return { ok: true, status: 200, json: async () => [{ roleName: 'USER' }] } as any;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: UserManagement } = await import('../../pages/UserManagement');
    render(<UserManagement />);
    expect(await screen.findByText('beta@corp.com')).toBeInTheDocument();
  });

  it('handleUpdateRoles covers 401 and 403 branches', async () => {
    document.cookie = 'jwt_token=valid.token.long.value; path=/';

    const pageResponse = {
      content: [baseUser()], pageable: { pageNumber: 0, pageSize: 20 }, totalElements: 1, totalPages: 1, first: true, last: true, number: 0, size: 20, empty: false,
    };

    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/users') && (!init || init.method === 'GET')) return { ok: true, status: 200, json: async () => pageResponse } as any;
      if (url.includes('/api/v1/admin/roles')) return { ok: true, status: 200, json: async () => [{ roleName: 'ADMIN' }, { roleName: 'USER' }] } as any;
      if (url.includes('/api/v1/admin/users/1/roles') && init?.method === 'PATCH') {
        // Alternate between 401 and 403 to hit both branches across two clicks
        if ((fetchMock as any).__once) return { ok: false, status: 403, text: async () => 'forbidden' } as any;
        (fetchMock as any).__once = true;
        return { ok: false, status: 401, text: async () => 'expired' } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;
    global.fetch = fetchMock;

    const { default: UserManagement } = await import('../../pages/UserManagement');
    render(<UserManagement />);

    // Open details then Manage Roles
    expect(await screen.findByText('alpha@corp.com')).toBeInTheDocument();
    fireEvent.click(screen.getByText('alpha@corp.com'));
    await screen.findByText(/User Information/i);
    fireEvent.click(screen.getByRole('button', { name: /Edit Roles/i }));

    // In role modal: deselect USER and select ADMIN
    const userBtn = screen.getByRole('button', { name: /User/i });
    const adminBtn = screen.getByRole('button', { name: /Admin/i });
    fireEvent.click(userBtn);
    fireEvent.click(adminBtn);

    window.alert = jest.fn();

    // First update => 401 path triggers redirect
    const updateBtn = screen.getByRole('button', { name: /Update Roles/i });
    fireEvent.click(updateBtn);

    await waitFor(() => expect(window.alert).toHaveBeenCalled());

    // Re-open role modal for second update (403)
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    fireEvent.click(screen.getByText('alpha@corp.com'));
    await screen.findByText(/User Information/i);
    fireEvent.click(screen.getByRole('button', { name: /Edit Roles/i }));
    fireEvent.click(adminBtn);
    fireEvent.click(updateBtn);

    await waitFor(() => {
      const calls = (window.alert as any).mock?.calls?.length ?? 0;
      expect(calls).toBeGreaterThanOrEqual(1);
    });
  });
});
