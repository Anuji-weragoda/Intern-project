import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

// Extra Profile coverage: submit without token, PATCH failure, cancel resets, unknown locale fallback.
describe('Profile extra branches', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, '', '/profile');
    document.cookie = '';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  const baseProfile = {
    email: 'user@example.com',
    displayName: 'Name',
    username: 'uname',
    roles: ['GUEST'], // unknown role => default badge color path
    createdAt: '2025-01-01T00:00:00Z',
    lastLoginAt: null, // formatDate => "Never"
    locale: 'xx', // unknown => getLocaleName fallback path
  };

  it('submit in edit mode without token shows updateError; cancel resets and exits edit mode', async () => {
    // Set token for initial GET so the page renders and allows entering edit mode
    document.cookie = 'jwt_token=valid.long.value; path=/';

    // Initial GET succeeds; later we'll clear the token before PATCH to trigger updateError
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/me') && (!init || !init.method || init.method === 'GET')) {
        return { ok: true, status: 200, json: async () => baseProfile } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: Profile } = await import('../../pages/Profile');
    render(<Profile />);

    // Enter edit mode
    const editBtn = await screen.findByRole('button', { name: /edit profile/i });
    fireEvent.click(editBtn);

    // Change a field
    const username = await screen.findByPlaceholderText('Enter your username');
    fireEvent.change(username, { target: { value: 'newuser' } });

  // Remove token before saving so handleSubmit sees no token
  document.cookie = 'jwt_token=; Max-Age=0; path=/';
  // Save without token => updateError is shown
    const save = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(save);
    expect(await screen.findByText(/No JWT token/i)).toBeInTheDocument();

    // Click Cancel resets form back to original and exits edit mode UI by showing static Profile Information section
    const cancel = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancel);
    await waitFor(() => expect(screen.getByText('Profile Information')).toBeInTheDocument());
  });

  it('PATCH failure surfaces as updateError', async () => {
    // Provide token cookie so submit goes to network and fails
    document.cookie = 'jwt_token=valid.long.value; path=/';

    const initial = { ...baseProfile };

    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/me') && (!init || !init.method || init.method === 'GET')) {
        return { ok: true, status: 200, json: async () => initial } as any;
      }
      if (url.includes('/api/v1/me') && init && init.method === 'PATCH') {
        return { ok: false, status: 400, text: async () => 'bad request' } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: Profile } = await import('../../pages/Profile');
    render(<Profile />);

    const edit = await screen.findByRole('button', { name: /edit profile/i });
    fireEvent.click(edit);
    const save = await screen.findByRole('button', { name: /save changes/i });
    fireEvent.click(save);

    expect(await screen.findByText(/Update Failed/i)).toBeInTheDocument();
  });
});
