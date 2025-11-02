import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

describe('AuditLog error handling', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/audit-log');
    document.cookie = 'jwt_token=; Max-Age=0; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('shows 401 Unauthorized message', async () => {
    document.cookie = 'jwt_token=fake.jwt; path=/';
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/audit-log')) {
        return { ok: false, status: 401, json: async () => ({}) } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: AuditLog } = await import('../../pages/AuditLog');
    render(<AuditLog />);

    expect(await screen.findByText(/401 Unauthorized/i)).toBeInTheDocument();
  });

  it('shows 403 Forbidden message', async () => {
    document.cookie = 'jwt_token=fake.jwt; path=/';
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/admin/audit-log')) {
        return { ok: false, status: 403, json: async () => ({}) } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: AuditLog } = await import('../../pages/AuditLog');
    render(<AuditLog />);

    expect(await screen.findByText(/403 Forbidden/i)).toBeInTheDocument();
  });
});
