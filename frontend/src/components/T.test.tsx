// Feature: urbanfit-jobs-frontend
// Unit tests for the T (translation) component (Req 1.8, 1.9 / Property 17).

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { T } from "./T";
import { K, strings, DEFAULT_FALLBACK_TEXT } from "../i18n";
import type { I18nKey } from "../i18n";

describe("T", () => {
  it("renders the Thai default text for a known key", () => {
    render(<T k={K.navJobs} />);
    // strings[nav.jobs].th === "ค้นหางาน"
    expect(screen.getByText("ค้นหางาน")).toBeInTheDocument();
  });

  it("renders into a span by default", () => {
    const { container } = render(<T k={K.navJobs} />);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span).toHaveTextContent("ค้นหางาน");
  });

  it("renders into a custom element when `as` is provided", () => {
    const { container } = render(<T k={K.discoveryTitle} as="h1" />);
    const heading = container.querySelector("h1");
    expect(heading).not.toBeNull();
    expect(heading).toHaveTextContent(strings[K.discoveryTitle].th);
  });

  it("forwards className to the wrapper element", () => {
    const { container } = render(<T k={K.navJobs} className="text-primary" />);
    const span = container.querySelector("span");
    expect(span).toHaveClass("text-primary");
  });

  it("renders a non-empty fallback (not the raw key) for a missing key", () => {
    // Cast: intentionally probing an unknown key to exercise the fallback path.
    const missing = "totally.missing.key" as I18nKey;
    const { container } = render(<T k={missing} />);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    // Never empty and never the raw key (Property 17 / Req 1.9).
    expect(span?.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(span).not.toHaveTextContent("totally.missing.key");
    expect(span).toHaveTextContent(DEFAULT_FALLBACK_TEXT);
  });

  it("resolves against a provided custom table", () => {
    const customTable = {
      "custom.key": { th: "สวัสดี", default: "Hello" },
    };
    render(<T k={"custom.key" as I18nKey} table={customTable} />);
    expect(screen.getByText("สวัสดี")).toBeInTheDocument();
  });
});
