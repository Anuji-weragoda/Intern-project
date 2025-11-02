import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as navigation from '../../utils/navigation';

describe('utils/navigation.redirect', () => {
  const originalEnv = { ...(process.env as Record<string, string | undefined>) };
  let pushStateSpy: jest.SpiedFunction<typeof window.history.pushState>;
  let dispatchSpy: jest.SpiedFunction<typeof window.dispatchEvent>;
  let locationGetSpy: any;

  beforeEach(() => {
    pushStateSpy = jest.spyOn(window.history, 'pushState');
    dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    locationGetSpy = undefined;
  });

  afterEach(() => {
    // Restore spies and original location object and env
    pushStateSpy.mockRestore();
    dispatchSpy.mockRestore();
    locationGetSpy?.mockRestore();
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  it('uses History API in test environments and dispatches popstate', () => {
    // Ensure test env is detected
  process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1';

  navigation.redirect('/hist');

    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/hist');
    expect(dispatchSpy).toHaveBeenCalled();
    const evt = dispatchSpy.mock.calls.at(-1)?.[0];
    expect(evt).toBeInstanceOf(PopStateEvent);
  });

  it('navigates by calling injected perform function in non-test envs', () => {
    // Force non-test environment for this assertion
    delete process.env.JEST_WORKER_ID;
    process.env.NODE_ENV = 'production';

  const perform = jest.fn();

  navigation.redirect('/real', { forceNonTest: true, perform });

    expect(perform).toHaveBeenCalledWith('/real');
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('falls back to History API in non-test envs when href assignment throws', () => {
    // Force non-test environment
    delete process.env.JEST_WORKER_ID;
    process.env.NODE_ENV = 'production';

    const perform = jest.fn(() => {
      throw new Error('simulated navigation throw');
    });

  navigation.redirect('/fallback', { forceNonTest: true, perform });

    expect(pushStateSpy).toHaveBeenCalled();
    const lastCall = pushStateSpy.mock.calls.at(-1);
    expect(lastCall?.[2]).toBe('/fallback');
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('navigateWithHistory falls back to same-origin relative URL when pushState throws', () => {
    // Simulate pushState throwing on the first attempt (e.g., absolute cross-origin URL in jsdom)
    pushStateSpy.mockImplementationOnce(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });

    navigation.navigateWithHistory('http://example.com/foo?bar#hash');

    // After the throw, it should compute a relative path and try again
    expect(pushStateSpy).toHaveBeenCalledTimes(2);
    const last = pushStateSpy.mock.calls.at(-1);
    expect(last?.[2]).toBe('/foo?bar#hash');
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
