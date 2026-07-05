// Feature: urbanfit-jobs-frontend
// Unit tests for the Icon component (Req 1.4).

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders the Material Symbols base class and the symbol name as text", () => {
    const { container } = render(<Icon name="search" />);
    const el = container.querySelector("span");
    expect(el).not.toBeNull();
    expect(el).toHaveClass("material-symbols-outlined");
    expect(el).toHaveTextContent("search");
  });

  it("applies the filled class when filled is true", () => {
    const { container } = render(<Icon name="work" filled />);
    const el = container.querySelector("span");
    expect(el).toHaveClass("material-symbols-outlined");
    expect(el).toHaveClass("filled");
  });

  it("does not apply the filled class by default", () => {
    const { container } = render(<Icon name="map" />);
    const el = container.querySelector("span");
    expect(el).not.toHaveClass("filled");
  });

  it("is decorative (aria-hidden) by default", () => {
    const { container } = render(<Icon name="map" />);
    const el = container.querySelector("span");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("is exposed as a labeled image when given an aria-label", () => {
    render(<Icon name="search" aria-label="ค้นหา" />);
    const el = screen.getByRole("img", { name: "ค้นหา" });
    expect(el).toBeInTheDocument();
    expect(el).not.toHaveAttribute("aria-hidden", "true");
  });

  it("appends custom className after the base classes", () => {
    const { container } = render(<Icon name="map" className="text-primary" />);
    const el = container.querySelector("span");
    expect(el).toHaveClass("material-symbols-outlined");
    expect(el).toHaveClass("text-primary");
  });
});
