// Feature: urbanfit-jobs-frontend
// Component tests for JobList (task 7.3). Example-based coverage of rendering N
// cards, marking the selected card (Req 4.8), and the empty-state message
// (Req 4.9).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { JobList } from "./JobList";
import type { Job } from "../../domain";
import { strings, K } from "../../i18n";

function makeJob(id: string, overrides: Partial<Job> = {}): Job {
  return {
    id,
    title: `Title ${id}`,
    company: `Company ${id}`,
    urbanFitScore: 80,
    lifestyleFitScore: 60,
    commutingMinutes: 30,
    routeDescription: `route ${id}`,
    monthlyTravelCostBaht: 1000,
    workModel: "Remote",
    location: null,
    ...overrides,
  };
}

const jobs: Job[] = [makeJob("a"), makeJob("b"), makeJob("c")];

describe("JobList", () => {
  it("renders one card per job (Req 4.8)", () => {
    render(<JobList jobs={jobs} selectedJobId={null} onSelect={() => {}} />);
    expect(screen.getAllByTestId("job-card")).toHaveLength(3);
  });

  it("uses a list structure", () => {
    render(<JobList jobs={jobs} selectedJobId={null} onSelect={() => {}} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("marks exactly the selected card as selected (Req 4.8)", () => {
    render(<JobList jobs={jobs} selectedJobId="b" onSelect={() => {}} />);
    const cards = screen.getAllByTestId("job-card");
    const selected = cards.filter(
      (c) => c.getAttribute("data-selected") === "true",
    );
    expect(selected).toHaveLength(1);
    expect(within(selected[0]).getByTestId("job-title")).toHaveTextContent(
      "Title b",
    );
  });

  it("marks no card as selected when selectedJobId is null", () => {
    render(<JobList jobs={jobs} selectedJobId={null} onSelect={() => {}} />);
    const cards = screen.getAllByTestId("job-card");
    expect(
      cards.filter((c) => c.getAttribute("data-selected") === "true"),
    ).toHaveLength(0);
  });

  it("forwards the job id to onSelect when a card is clicked", () => {
    const onSelect = vi.fn();
    render(<JobList jobs={jobs} selectedJobId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getAllByTestId("job-card")[2]);
    expect(onSelect).toHaveBeenCalledWith("c");
  });

  it("shows the empty-state message when there are zero jobs (Req 4.9)", () => {
    render(<JobList jobs={[]} selectedJobId={null} onSelect={() => {}} />);
    expect(screen.queryByTestId("job-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("jobs-empty")).toBeInTheDocument();
    expect(screen.getByText(strings[K.jobsEmpty].th)).toBeInTheDocument();
  });
});
