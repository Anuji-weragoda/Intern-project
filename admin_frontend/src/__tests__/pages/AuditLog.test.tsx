import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

describe('AuditLog page', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/audit');
    document.cookie = 'jwt_token=; Max-Age=0; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('renders logs table when token present and API returns data', async () => {
    document.cookie = 'jwt_token=fake.jwt; path=/';

    const logs = [
      { id: 1, email: 'a@corp.com', eventType: 'LOGIN', success: true, userId: 10, ipAddress: '1.1.1.1', userAgent: 'UA', createdAt: new Date().toISOString(), cognitoSub: 'sub-a' },
      { id: 2, email: 'b@corp.com', eventType: 'LOGIN', success: false, failureReason: 'Bad creds', userId: 11, ipAddress: '2.2.2.2', userAgent: 'UA', createdAt: new Date().toISOString(), cognitoSub: 'sub-b' },
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

    expect(await screen.findByText('Audit Log')).toBeInTheDocument();
    expect(await screen.findByText('a@corp.com')).toBeInTheDocument();
    expect(await screen.findByText('b@corp.com')).toBeInTheDocument();
    // should show Success and Failed badges text somewhere in the table
    expect(screen.getAllByText('Success').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
  });
});
