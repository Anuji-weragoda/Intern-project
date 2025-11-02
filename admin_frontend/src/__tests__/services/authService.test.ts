import { jest } from '@jest/globals';

describe('authService.getSession', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Clear cookies and reset fetch between tests
    document.cookie = 'jwt_token=; Max-Age=0; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('returns null when endpoints fail or no identity present', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      calls.push(url);
      // respond with 404 or ok:{} without identifiers
      if (url.includes('/api/v1/me/session')) {
        return { ok: false, status: 404, json: async () => ({}) } as any;
      }
      if (url.endsWith('/api/v1/me')) {
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }
      if (url.includes('/api/v1/me/session/')) {
        return { ok: false, status: 500, json: async () => ({}) } as any;
      }
      throw new Error('Unexpected fetch ' + url);
    }) as any;

    const auth = await import('../../services/authService');
    const user = await auth.getSession();
    expect(user).toBeNull();
    expect(calls.some(u => u.includes('/api/v1/me'))).toBe(true);
  });

  it('returns user when endpoint returns identity', async () => {
    const fakeUser = { email: 'u@example.com', username: 'user1' };
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/me')) {
        return { ok: true, status: 200, json: async () => fakeUser } as any;
      }
      return { ok: false, status: 404, json: async () => ({}) } as any;
    }) as any;

    const auth = await import('../../services/authService');
    const user = await auth.getSession();
    expect(user).toEqual(fakeUser);
  });

  it('fetches by-sub when minimal data contains only sub and returns profile', async () => {
    const sub = 'abc-123';
    const profile = { email: 'profile@example.com', displayName: 'Profile User' };
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/me')) {
        return { ok: true, status: 200, json: async () => ({ sub }) } as any;
      }
      if (url.includes(`/api/v1/me/by-sub/${sub}`)) {
        return { ok: true, status: 200, json: async () => profile } as any;
      }
      return { ok: false, status: 404, json: async () => ({}) } as any;
    }) as any;

    const auth = await import('../../services/authService');
    const user = await auth.getSession();
    expect(user).toEqual(profile);
  });
});
