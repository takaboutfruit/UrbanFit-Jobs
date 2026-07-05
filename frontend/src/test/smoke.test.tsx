import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import fc from "fast-check";
import { App } from "../App";

describe("scaffold smoke test", () => {
  it("runs the test runner", () => {
    expect(true).toBe(true);
  });

  it("renders the App component into a jsdom DOM", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "UrbanFit Jobs" })
    ).toBeInTheDocument();
  });

  it("has a working fast-check property runner", () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      })
    );
  });
});
