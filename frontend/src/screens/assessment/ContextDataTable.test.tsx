// Feature: urbanfit-jobs-frontend
// Component tests for ContextDataTable (task 9.2 / Req 7.3, 7.4, 7.5).

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ContextDataTable } from "./ContextDataTable";
import { strings, K } from "../../i18n";
import type { ContextTable } from "../../domain";

const sampleTable: ContextTable = {
  headers: ["สถานี", "PM2.5", "พิกัด"],
  rows: [
    ["สยาม", "42", "13.7456, 100.5341"],
    ["อโศก", "55", "13.7370, 100.5600"],
    ["บางนา", "61", "13.6680, 100.6040"],
  ],
};

describe("ContextDataTable", () => {
  it("renders each column header as a visible <th> header cell (Req 7.3)", () => {
    render(<ContextDataTable table={sampleTable} />);
    const headerCells = screen.getAllByRole("columnheader");
    expect(headerCells).toHaveLength(3);
    expect(headerCells.map((c) => c.textContent)).toEqual([
      "สถานี",
      "PM2.5",
      "พิกัด",
    ]);
  });

  it("renders every data row and its cells (Req 7.3)", () => {
    render(<ContextDataTable table={sampleTable} />);
    // 1 header row + 3 body rows.
    expect(screen.getAllByRole("row")).toHaveLength(4);
    const cells = screen.getAllByRole("cell");
    expect(cells).toHaveLength(9);
    expect(screen.getByText("สยาม")).toBeInTheDocument();
    expect(screen.getByText("13.6680, 100.6040")).toBeInTheDocument();
  });

  it("wraps the table in a scroll container with a max-height and vertical overflow (Req 7.4)", () => {
    render(<ContextDataTable table={sampleTable} />);
    const scroll = screen.getByTestId("context-data-scroll");
    expect(scroll.className).toContain("overflow-y-auto");
    expect(scroll.className).toMatch(/max-h-/);
  });

  it("makes the header row sticky so it stays visible while scrolling (Req 7.4)", () => {
    const { container } = render(<ContextDataTable table={sampleTable} />);
    const thead = container.querySelector("thead");
    expect(thead).not.toBeNull();
    expect(thead?.className).toContain("sticky");
    expect(thead?.className).toContain("top-0");
    // The header cells are sticky too so they pin during scroll.
    for (const th of screen.getAllByRole("columnheader")) {
      expect(th.className).toContain("sticky");
      expect(th.className).toContain("top-0");
    }
  });

  it("shows the no-context-data message and preserves the container when table is null (Req 7.5)", () => {
    render(<ContextDataTable table={null} />);
    // Container box still present (layout preserved, not collapsed).
    const box = screen.getByTestId("context-data-table");
    expect(box).toBeInTheDocument();
    expect(box).toHaveAttribute("data-empty", "true");
    // No table rendered.
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    // Empty message rendered.
    expect(
      within(box).getByText(strings[K.contextEmpty].th),
    ).toBeInTheDocument();
  });

  it("shows the no-context-data message when headers/rows are empty (Req 7.5)", () => {
    render(<ContextDataTable table={{ headers: [], rows: [] }} />);
    const box = screen.getByTestId("context-data-table");
    expect(box).toHaveAttribute("data-empty", "true");
    expect(screen.getByText(strings[K.contextEmpty].th)).toBeInTheDocument();

    // Headers present but no rows -> still empty state.
    render(<ContextDataTable table={{ headers: ["a", "b"], rows: [] }} />);
    expect(screen.getAllByText(strings[K.contextEmpty].th).length).toBeGreaterThan(0);
  });
});
