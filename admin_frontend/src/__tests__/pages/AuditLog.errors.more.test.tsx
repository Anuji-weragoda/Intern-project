import { render, screen, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';

describe('AuditLog non-ok (HTTP 500) error and refresh', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/audit-log');
    document.cookie = 'jwt_token=very.long.token; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('shows generic HTTP 500 error and refresh triggers another fetch', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/audit-log')) {
        // First call returns 500; second call returns an empty array for a clean table/empty state path
        if ((fetchMock as any).__once) {
          return { ok: true, status: 200, json: async () => [] } as any;
        }
        (fetchMock as any).__once = true;
        return { ok: false, status: 500, text: async () => 'boom' } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;
    global.fetch = fetchMock;

    const { default: AuditLog } = await import('../../pages/AuditLog');
    render(<AuditLog />);

    // 500 branch shows error panel with our message
    expect(await screen.findByText(/Error Loading Logs/i)).toBeInTheDocument();
    expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument();

    // Click Refresh to re-fetch and land in empty state (no error)
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(await screen.findByText(/No Audit Logs Found/i)).toBeInTheDocument();
  });
});
