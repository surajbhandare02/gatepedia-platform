import { render, screen } from "@testing-library/react";
import { PageSkeleton } from "./components/ui/PageSkeleton";

test("renders enterprise loading skeleton", () => {
  render(<PageSkeleton />);
  expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
});
