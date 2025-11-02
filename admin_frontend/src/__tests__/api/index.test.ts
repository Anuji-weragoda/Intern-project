import { jest } from '@jest/globals';
import { apiFetch } from '../../api/index';

// @ts-ignore - global fetch for tests
;(globalThis as any).fetch = jest.fn(async (url, init) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({ ok: true, url, init }),
  } as any;
});

describe('apiFetch', () => {
  it('prefixes path with API base and includes credentials', async () => {
    // @ts-ignore
    ;(globalThis as any).fetch.mockClear();
    await apiFetch('/hello');
    expect((globalThis as any).fetch).toHaveBeenCalled();
    const [calledUrl, init] = ((globalThis as any).fetch as jest.Mock).mock.calls[0] as [string, any];
    expect(calledUrl).toMatch(/^http:\/\/localhost:8081/);
    expect(init.credentials).toBe('include');
    expect(init.headers['Content-Type']).toBe('application/json');
  });
});
