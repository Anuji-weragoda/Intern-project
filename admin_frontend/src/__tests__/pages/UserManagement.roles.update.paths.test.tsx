import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';

// Simple deferred helper for controlling async resolution
const deferred = () => {
  let resolve!: (v?: any) => void;
  let reject!: (e?: any) => void;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('UserManagement – role update branches and UI controls', () => {
  const user = {
    id: 1,
    email: 'jane.doe@example.com',
    username: 'jane',
    isActive: true,
    roles: ['USER'],
    createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
    lastLoginAt: null,
  };

  const roles = [
    { roleName: 'ADMIN' },
    { roleName: 'HR' },
    { roleName: 'USER' },
  ];

  let alertSpy: any;

  beforeEach(() => {
    // Token via cookie so getJWT returns something truthy
    Object.defineProperty(document, 'cookie', {
      value: 'jwt_token=fake.jwt.token.value.with.length',
      writable: true,
      configurable: true,
    });

    // Use history API to control URL without replacing window.location
    window.history.replaceState({}, '', '/admin/users');

    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  function mockFetchSequence(overrides?: Record<string, any>) {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      // available roles
      if (url.includes('/api/v1/admin/roles')) {
        return { ok: true, status: 200, json: async () => roles } as any;
      }

      // list users
      if (url.includes('/api/v1/admin/users') && (init?.method === 'GET' || !init?.method)) {
        const page = {
          content: [user],
          pageable: { pageNumber: 0, pageSize: 20 },
          totalElements: 1,
          totalPages: 1,
          last: true,
          first: true,
          number: 0,
          size: 20,
          empty: false,
        };
        return { ok: true, status: 200, json: async () => page } as any;
      }

      // patch roles – optionally overridden per test
      if (url.match(/\/api\/v1\/admin\/users\/(\d+)\/roles/) && init?.method === 'PATCH') {
        if (overrides?.patchResponse === '403') {
          return { ok: false, status: 403, text: async () => 'Forbidden' } as any;
        }
        if (overrides?.patchResponse === 'pending') {
          const d = deferred();
          // resolve later in test via overrides.deferredResolve
          overrides!.deferredResolve = d.resolve;
          return d.promise as any;
        }
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }

      // default fall-through
      return { ok: true, status: 200, json: async () => ({}) } as any;
    });

    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  async function openRoleModalForFirstRow() {
    // click first "Manage Roles" button in the table
    const manageButtons = await screen.findAllByRole('button', { name: /manage roles/i });
    fireEvent.click(manageButtons[0]);
    // modal title
    await screen.findByRole('heading', { name: /manage user roles/i });
  }

  test('Update roles – 403 branch shows access denied alert and returns', async () => {
  mockFetchSequence({ patchResponse: '403' });

  const { default: UserManagement } = await import('../../pages/UserManagement');
  render(<UserManagement />);

    // wait initial table
    await screen.findByText(/user management/i);
    await screen.findByText(user.email);

    await openRoleModalForFirstRow();

    // select ADMIN role to ensure selectedRoles is non-empty
    const adminButtons = await screen.findAllByRole('button', { name: /admin/i });
    fireEvent.click(adminButtons[0]);

    const updateBtn = screen.getByRole('button', { name: /update roles/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      const last = String((alertSpy.mock.calls.at(-1) ?? [])[0] ?? '');
      expect(last.toLowerCase()).toContain("access denied");
    });
  });

  test('Update roles – success branch updates UI and shows success alert', async () => {
  mockFetchSequence();

  const { default: UserManagement } = await import('../../pages/UserManagement');
  render(<UserManagement />);

    await screen.findByText(/user management/i);
    await screen.findByText(user.email);

    await openRoleModalForFirstRow();

    // toggle HR
  const hrBtn = await screen.findByRole('button', { name: /\bhr\b/i });
    fireEvent.click(hrBtn);

    const updateBtn = screen.getByRole('button', { name: /update roles/i });
    fireEvent.click(updateBtn);

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    // Modal should close and table reflect change (badge for HR or at least not throw)
    await waitFor(() => expect(screen.queryByRole('heading', { name: /manage user roles/i })).not.toBeInTheDocument());
  });

  test('Update roles – shows spinner while pending and then resolves', async () => {
  const overrides: Record<string, any> = { patchResponse: 'pending' };
  mockFetchSequence(overrides);

  const { default: UserManagement } = await import('../../pages/UserManagement');
  render(<UserManagement />);

    await screen.findByText(/user management/i);
    await screen.findByText(user.email);
    await openRoleModalForFirstRow();

  // select HR to ensure selectedRoles is non-empty
  const hrBtn = await screen.findByRole('button', { name: /\bhr\b/i });
  fireEvent.click(hrBtn);

    fireEvent.click(screen.getByRole('button', { name: /update roles/i }));

    // spinner state text
    await screen.findByText(/updating.../i);

    // resolve the pending PATCH
    act(() => {
      overrides.deferredResolve({ ok: true, status: 200, json: async () => ({}) });
    });

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });

  test('Clear Filters button resets search and role filter', async () => {
  mockFetchSequence();

  const { default: UserManagement } = await import('../../pages/UserManagement');
  render(<UserManagement />);

    await screen.findByText(user.email);

    const search = screen.getByPlaceholderText(/search by email or username/i) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'jane' } });

  const roleSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });

    const clearBtn = await screen.findByRole('button', { name: /clear filters/i });
    fireEvent.click(clearBtn);

    expect(search.value).toBe('');
    expect(roleSelect.value).toBe('');
  });

  test('Error panel Show Debug Info path triggers alert', async () => {
    // No token scenario -> fetchUsers sets error
    Object.defineProperty(document, 'cookie', { value: '', writable: true });

    // fetchAvailableRoles can still be called; keep it benign
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/admin/roles')) {
        return new Response(JSON.stringify(roles), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      // users endpoint should not be called with a token; but if called, return 401 to keep error state
      if (url.includes('/api/v1/admin/users')) {
        return new Response('Unauthorized', { status: 401 });
      }
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

  const { default: UserManagement } = await import('../../pages/UserManagement');
  render(<UserManagement />);

    // Wait for error panel
    await screen.findByText(/authentication error/i);

    const dbgBtn = screen.getByRole('button', { name: /show debug info/i });
    fireEvent.click(dbgBtn);

    expect(alertSpy).toHaveBeenCalled();
  });
});
