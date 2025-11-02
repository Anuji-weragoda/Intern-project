import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';

describe('Profile edit flow', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, '', '/profile');
    document.cookie = 'jwt_token=; Max-Age=0; path=/';
    global.fetch = originalFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  it('updates profile via PATCH and shows success', async () => {
    document.cookie = 'jwt_token=fake.jwt; path=/';

    const initial = {
      email: 'user@example.com',
      displayName: 'Old Name',
      username: 'user',
      roles: ['USER'],
      createdAt: '2025-01-01T00:00:00Z',
      lastLoginAt: '2025-11-01T00:00:00Z',
    };
    const updated = { ...initial, displayName: 'New Name' };

    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/v1/me') && (!init || !init.method || init.method === 'GET')) {
        return { ok: true, status: 200, json: async () => initial } as any;
      }
      if (url.includes('/api/v1/me') && init && init.method === 'PATCH') {
        return { ok: true, status: 200, json: async () => updated } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    }) as any;

    const { default: Profile } = await import('../../pages/Profile');
    render(<Profile />);

    // enter edit mode
    const editBtn = await screen.findByRole('button', { name: /edit profile/i });
    fireEvent.click(editBtn);

    // change display name
    const displayNameInput = await screen.findByPlaceholderText('Enter your display name');
    fireEvent.change(displayNameInput, { target: { value: 'New Name' } });

    // save changes
    const saveBtn = await screen.findByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    // success banner and updated name should appear
    await waitFor(() => expect(screen.getByText(/Success!/i)).toBeInTheDocument());
    expect(screen.getAllByText('New Name').length).toBeGreaterThan(0);
  });
});
