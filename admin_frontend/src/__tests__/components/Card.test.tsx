import { render, screen } from '@testing-library/react';
import Card from '../../components/Card';

describe('Card', () => {
  it('renders title and children', () => {
    render(
      <Card title="Hello">
        <span>Content</span>
      </Card>
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="test-class">Child</Card>);
    expect(container.firstChild).toHaveClass('test-class');
  });
});
