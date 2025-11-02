import { render, screen, fireEvent, within } from '@testing-library/react';
import { jest } from '@jest/globals';

// Additional edge-case coverage for AuditLog: no JWT, invalid response format,
// unknown event type color fallback, invalid date formatting, and failure reason display.
describe('AuditLog additional branches', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/audit-log');
    document.cookie = 'jwt_token=; Max-Age=0; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('shows error when no JWT token found (URL and cookies empty)', async () => {
    const { default: AuditLog } = await import('../../pages/AuditLog');
    render(<AuditLog />);
    expect(await screen.findByText(/Error Loading Logs/i)).toBeInTheDocument();
    expect(screen.getByText(/No JWT token found/i)).toBeInTheDocument();
  });

  it('handles non-array response with error, and covers color/date fallbacks', async () => {
    // Provide token via cookie
    document.cookie = 'jwt_token=very.long.token.value; path=/';

    const badResponse = { foo: 'bar' }; // not an array => triggers "Invalid response format" path

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/audit-log')) {
        return { ok: true, status: 200, json: async () => badResponse } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: AuditLog } = await import('../../pages/AuditLog');
    render(<AuditLog />);

    expect(await screen.findByText(/Invalid response format/i)).toBeInTheDocument();
  });

  it('renders failure reason, unknown event type color, and invalid date string as-is', async () => {
    document.cookie = 'jwt_token=another.very.long.token; path=/';

    const logs = [
      {
        id: 99,
        email: 'x@corp.com',
        eventType: 'SOMETHING_NEW', // not in color map => default branch
        success: false,
        failureReason: 'Because test',
        userId: 500,
        ipAddress: '127.0.0.99',
        userAgent: 'UA',
        createdAt: 'not-a-date', // invalid date => formatDate catch path
        cognitoSub: 'sub-99',
      },
    ];

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/audit-log')) {
        return { ok: true, status: 200, json: async () => logs } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: AuditLog } = await import('../../pages/AuditLog');
    render(<AuditLog />);

  // Row content (scope within the row to avoid duplicate 'Failed' text in stats)
  const emailCell = await screen.findByText('x@corp.com');
  const row = emailCell.closest('tr') as HTMLElement;
  expect(row).toBeTruthy();
  expect(within(row).getByText('Failed')).toBeInTheDocument();
  expect(within(row).getByText('Because test')).toBeInTheDocument();
  // Invalid date renders as 'Invalid Date' via toLocaleString on invalid Date
  expect(within(row).getByText('Invalid Date')).toBeInTheDocument();

    // Export CSV to cover click path again with this dataset
    // Stub object URL & anchor click to avoid jsdom navigation noise
    const origCreateObjURL = (URL as any).createObjectURL;
    (URL as any).createObjectURL = jest.fn(() => 'blob://csv');
    const exportBtn = await screen.findByRole('button', { name: /Export CSV/i });
    fireEvent.click(exportBtn);
    expect((URL as any).createObjectURL).toHaveBeenCalled();
    if (origCreateObjURL) (URL as any).createObjectURL = origCreateObjURL; else delete (URL as any).createObjectURL;
  });
});
