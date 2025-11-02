import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('PrivateRoute', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('shows loading state when loading', async () => {
    await jest.unstable_mockModule('../../hooks/useAuth', () => ({
      __esModule: true,
      default: () => ({ isAuthenticated: false, loading: true }),
    }));
    const { default: Comp } = await import('../../utils/PrivateRoute');
    render(
      <Comp>
        <div>Secret</div>
      </Comp>
    );

    expect(screen.getByText('Checking session...')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', async () => {
    const redirectMock = jest.fn();

    await jest.unstable_mockModule('../../hooks/useAuth', () => ({
      __esModule: true,
      default: () => ({ isAuthenticated: false, loading: false }),
    }));
    await jest.unstable_mockModule('../../utils/navigation', () => ({
      __esModule: true,
      redirect: redirectMock,
      default: { redirect: redirectMock },
    }));

    const { default: Comp } = await import('../../utils/PrivateRoute');
    render(
      <Comp>
        <div>Secret</div>
      </Comp>
    );

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock.mock.calls[0][0]).toContain('/oauth2/authorization/cognito');
  });

  it('renders children when authenticated', async () => {
    await jest.unstable_mockModule('../../hooks/useAuth', () => ({
      __esModule: true,
      default: () => ({ isAuthenticated: true, loading: false }),
    }));
    const { default: Comp } = await import('../../utils/PrivateRoute');

    render(
      <Comp>
        <div>Secret</div>
      </Comp>
    );

    expect(screen.getByText('Secret')).toBeInTheDocument();
  });
});
