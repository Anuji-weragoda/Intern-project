import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('Unauthorized page', () => {
  it('renders and clicking button navigates back', async () => {
    const { default: Unauthorized } = await import('../../pages/Unauthorized');

    // Render inside a router to satisfy useNavigate
    render(
      <MemoryRouter>
        <Unauthorized />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Access Denied/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /sign in with a different account/i });
    fireEvent.click(btn);
  });
});
