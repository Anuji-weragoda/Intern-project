import authService from '../../services/authService';
import { jest } from '@jest/globals';

describe('authService.logout and getSession fallbacks', () => {
  it('creates a form and submits to /logout', async () => {
    const originalCreate = document.createElement;
    const submit = jest.fn();
    // Mock createElement to return a form-like element
    jest.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'form') {
        const el = originalCreate.call(document, 'form') as HTMLFormElement;
        // Override submit with spy
        (el as any).submit = submit;
        // Attach to body appendChild expectations inside impl
        return el as any;
      }
      return originalCreate.call(document, tag) as any;
    }) as any);

    await authService.logout();
    expect(submit).toHaveBeenCalled();

    // Restore
    (document.createElement as any).mockRestore();
  });

  it('getSession returns null when endpoints fail', async () => {
    // Mock apiFetch via fetch because ../api/index re-exports a fetch wrapper,
    // but getSession uses it like a fetch compatible function
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => { throw new Error('network'); }) as any;

    // Dynamic import to ensure mocked fetch is in place for api layer
    const mod = await import('../../services/authService');
    const user = await mod.getSession();
    expect(user).toBeNull();

    global.fetch = originalFetch as any;
  });
});
