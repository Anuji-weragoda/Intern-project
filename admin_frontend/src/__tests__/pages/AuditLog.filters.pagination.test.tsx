import { render, screen, fireEvent, within } from '@testing-library/react';
import { jest } from '@jest/globals';

describe('AuditLog filters, pagination, and export', () => {
  const originalFetch = global.fetch;
  const makeLog = (id: number, email: string, eventType: string, success: boolean) => ({
    id,
    email,
    eventType,
    success,
    failureReason: success ? undefined : 'Bad creds',
    userId: id + 100,
    ipAddress: `10.0.0.${id}`,
    userAgent: 'UA',
    createdAt: new Date().toISOString(),
    cognitoSub: `sub-${id}`,
  });

  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/audit');
    document.cookie = 'jwt_token=fake.jwt; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('applies search, event/status filters, paginates, changes rows per page, and exports CSV', async () => {
    const logs = [
      makeLog(1, 'alice@corp.com', 'LOGIN', true),
      makeLog(2, 'bob@corp.com', 'LOGOUT', true),
      makeLog(3, 'carl@corp.com', 'LOGIN', false),
      makeLog(4, 'dana@corp.com', 'UPDATE', true),
      makeLog(5, 'eric@corp.com', 'DELETE', false),
      makeLog(6, 'faye@corp.com', 'ACCESS', true),
      makeLog(7, 'gabe@corp.com', 'CREATE', true),
      makeLog(8, 'helen@corp.com', 'LOGIN', false),
      makeLog(9, 'ian@corp.com', 'LOGIN', true),
      makeLog(10, 'jill@corp.com', 'LOGIN', true),
      makeLog(11, 'kate@corp.com', 'LOGIN', true),
    ];

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/audit-log')) {
        return { ok: true, status: 200, json: async () => logs } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

  // Ensure URL.createObjectURL exists and returns a stable blob URL
  const origCreateObjURL = (URL as any).createObjectURL;
  (URL as any).createObjectURL = jest.fn(() => 'blob://x');
  // Stub element creation so a.click won't crash in jsdom
  const clickSpy = jest.spyOn(document, 'createElement');

    const { default: AuditLog } = await import('../../pages/AuditLog');
    render(<AuditLog />);

    // Wait for table content
    expect(await screen.findByText('alice@corp.com')).toBeInTheDocument();

    // Search filter: narrow to alice
    const search = screen.getByPlaceholderText(/search by email/i);
    fireEvent.change(search, { target: { value: 'alice' } });
    expect(await screen.findByText('alice@corp.com')).toBeInTheDocument();
    expect(screen.queryByText('bob@corp.com')).not.toBeInTheDocument();

  // Event type filter (labels not programmatically associated in markup, select by role)
  const selects = screen.getAllByRole('combobox');
  const eventSelect = selects[0];
    fireEvent.change(eventSelect, { target: { value: 'LOGIN' } });
    // Status filter: failure only
    const statusSelect = selects[1];
    fireEvent.change(statusSelect, { target: { value: 'failure' } });

    // Update search to match a failing LOGIN record
    fireEvent.change(search, { target: { value: 'carl' } });
    expect(await screen.findByText('carl@corp.com')).toBeInTheDocument();

    // Clear search to ensure multiple rows exist for pagination checks
    fireEvent.change(search, { target: { value: '' } });

  // Rows per page change (label not programmatically associated; scope within the container)
  const rowsContainer = screen.getByText(/rows per page/i).closest('div')!;
  const rowsSelect = within(rowsContainer).getByRole('combobox');
    fireEvent.change(rowsSelect, { target: { value: '5' } });

    // Go to next page
    // Disambiguate: pick the pagination container by the "Page X of Y" text, not the "Rows per page" label
    const pageNodes = screen.getAllByText(/Page/i);
    const pageInfo = pageNodes.find(el => /Page\s+\d+\s+of\s+\d+/.test(el.textContent || ''))!;
    const footer = pageInfo.closest('div')!.parentElement!;
    const buttons = within(footer).getAllByRole('button');
    // Click the right-chevron (next page) button
    fireEvent.click(buttons[buttons.length - 1]);

    // Export CSV
    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportBtn);

  expect((URL as any).createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    if (origCreateObjURL) {
      (URL as any).createObjectURL = origCreateObjURL;
    } else {
      delete (URL as any).createObjectURL;
    }
    clickSpy.mockRestore();
  });

  it('supports first/prev pagination and shows empty state when no logs', async () => {
    // First run with data to exercise prev/first
    const logsMany = Array.from({ length: 12 }, (_, i) => makeLog(i + 1, `u${i + 1}@corp.com`, 'LOGIN', true));

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/audit-log')) {
        // Return data only for first mount; next mount return empty
        if ((fetchMock as any).__once) return { ok: true, status: 200, json: async () => [] } as any;
        (fetchMock as any).__once = true;
        return { ok: true, status: 200, json: async () => logsMany } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;
    global.fetch = fetchMock;

  const { default: AuditLog } = await import('../../pages/AuditLog');
  const { unmount } = render(<AuditLog />);

    // Wait for table, set rows per page to 5
    expect(await screen.findByText('u1@corp.com')).toBeInTheDocument();
    const rowsContainer = screen.getByText(/rows per page/i).closest('div')!;
    const rowsSelect = within(rowsContainer).getByRole('combobox');
    fireEvent.change(rowsSelect, { target: { value: '5' } });

    // Move to page 2 (next)
    const pageNodes = screen.getAllByText(/Page/i);
    const pageInfo = pageNodes.find(el => /Page\s+\d+\s+of\s+\d+/.test(el.textContent || ''))!;
    const footer = pageInfo.closest('div')!.parentElement!;
    const buttons = within(footer).getAllByRole('button');
    const firstBtn = buttons[0];
    const prevBtn = buttons[1];
    const nextBtn = buttons[buttons.length - 1];
    fireEvent.click(nextBtn);

    // Now go back using prev, then jump to first
    fireEvent.click(prevBtn);
    fireEvent.click(firstBtn);

  // Remount to get empty state path
  unmount();
  render(<AuditLog />);
    expect(await screen.findByText(/No audit logs found/i)).toBeInTheDocument();
  });
});
