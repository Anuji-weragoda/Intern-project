import { render, screen, fireEvent, within } from '@testing-library/react';
import { jest } from '@jest/globals';

// This suite targets uncovered branches in UserManagement: username search path,
// details modal "No roles assigned" branch, ML role descriptions, and disabled Update button.
describe('UserManagement extra branches', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/users');
    document.cookie = 'jwt_token=very.long.jwt.token.value.for.tests; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('supports username search, details with no roles, and ML role description', async () => {
    // Two users: one with no roles (will trigger the empty roles branch),
    // another with ML2 to render ML2 description lines in details.
    const pageResponse = {
      content: [
        {
          id: 10,
          email: 'no-roles@corp.com',
          username: 'noroles',
          isActive: true,
          roles: [],
          createdAt: '2025-01-01T00:00:00Z',
          lastLoginAt: null,
        },
        {
          id: 11,
          email: 'manager@corp.com',
          username: 'manager',
          isActive: false,
          roles: ['ML2'],
          createdAt: '2025-01-01T00:00:00Z',
          lastLoginAt: '2025-01-10T12:00:00Z',
        },
      ],
      pageable: { pageNumber: 0, pageSize: 20 },
      totalElements: 2,
      totalPages: 1,
      first: true,
      last: true,
      number: 0,
      size: 20,
      empty: false,
    };

    // Force roles endpoint to fail so defaults are used (covers default roles path already but harmless here)
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/roles')) return { ok: false, status: 500, text: async () => 'err' } as any;
      if (url.includes('/api/v1/admin/users') && (!init || init.method === 'GET')) return { ok: true, status: 200, json: async () => pageResponse } as any;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: UserManagement } = await import('../../pages/UserManagement');
    render(<UserManagement />);

    // Both users show up initially
    expect(await screen.findByText('no-roles@corp.com')).toBeInTheDocument();
    expect(await screen.findByText('manager@corp.com')).toBeInTheDocument();

    // Username search should filter by username (not just email)
    const searchBox = screen.getByPlaceholderText(/search by email or username/i);
    fireEvent.change(searchBox, { target: { value: 'noroles' } });
    expect(await screen.findByText('no-roles@corp.com')).toBeInTheDocument();
    expect(screen.queryByText('manager@corp.com')).not.toBeInTheDocument();

    // Clear filters via Clear Filters button (already covered elsewhere, but leaves clean state here)
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

  // Open details for the no-roles user and assert the empty roles branch
    fireEvent.click(screen.getByText('no-roles@corp.com'));
    expect(await screen.findByText(/User Information/i)).toBeInTheDocument();
  // Scope to the details dialog to avoid matching the list's inline "No roles assigned"
  const rolesHeading = screen.getByRole('heading', { name: /Current Roles & Permissions/i });
  const rolesScope = (rolesHeading.parentElement?.parentElement || rolesHeading.parentElement || document.body) as HTMLElement;
  expect(within(rolesScope).getByText(/No roles assigned/i)).toBeInTheDocument();

  // From the no-roles details, open the role modal, ensure Update disabled with no selection, then cancel
  fireEvent.click(screen.getByRole('button', { name: /Edit Roles/i }));
    const updateBtn = await screen.findByRole('button', { name: /Update Roles/i });
    expect(updateBtn).toBeDisabled();
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

  // Close details by toggling the same row again
  fireEvent.click(screen.getByText('no-roles@corp.com'));

  // Open details for the ML2 user and assert ML2 description renders
  fireEvent.click(screen.getByText('manager@corp.com'));
  expect(await screen.findByText(/User Information/i)).toBeInTheDocument();
  expect(screen.getByText(/Management Level 2 — mid-level management responsibilities/i)).toBeInTheDocument();
  });
});
