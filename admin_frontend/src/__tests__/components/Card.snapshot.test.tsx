import { render, screen } from "@testing-library/react";
import Card from "../../components/Card";

describe("Card component snapshot", () => {
  it("matches snapshot with title and children", () => {
    const { asFragment } = render(
      <Card title="Test Title">
        <p>Body content</p>
      </Card>
    );

    // basic sanity assertions to aid debug if snapshot changes
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });

  it("matches snapshot without title", () => {
    const { asFragment } = render(
      <Card>
        <span>No title body</span>
      </Card>
    );

    expect(screen.getByText("No title body")).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });
});
