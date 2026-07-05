// Feature: urbanfit-jobs-frontend
// Component tests for JobCard (task 7.3). Example-based coverage of field
// rendering (Req 4.3, 4.4, 4.5, 4.6, 4.7), the null-commute unavailable
// indicator (Req 4.5), the selected state (Req 4.8), and onSelect wiring.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { JobCard } from "./JobCard";
import { formatMonthlyCostTHB } from "../../domain";
import type { Job } from "../../domain";
import { strings, K } from "../../i18n";

/** A representative, fully populated job used across the examples. */
const baseJob: Job = {
  id: "job-1",
  title: "Data Analyst",
  company: "Acme Analytics",
  urbanFitScore: 88,
  lifestyleFitScore: 73,
  commutingMinutes: 45,
  routeDescription: "45 นาที ผ่าน BTS + BRT",
  monthlyTravelCostBaht: 1200,
  workModel: "Hybrid",
  location: { lat: 13.7, lng: 100.5 },
};

describe("JobCard", () => {
  it("renders the job title and company (Req 4.3)", () => {
    render(<JobCard job={baseJob} isSelected={false} onSelect={() => {}} />);
    expect(screen.getByTestId("job-title")).toHaveTextContent("Data Analyst");
    expect(screen.getByTestId("job-company")).toHaveTextContent("Acme Analytics");
  });

  it("renders the Lifestyle-Fit-Score with a matching progress indicator (Req 4.4)", () => {
    render(<JobCard job={baseJob} isSelected={false} onSelect={() => {}} />);
    const ring = screen.getByTestId("progress-ring");
    expect(ring).toHaveAttribute("aria-valuenow", "73");
    expect(ring).toHaveAttribute("data-value", "73");
  });

  it("renders the commuting route description (Req 4.5)", () => {
    render(<JobCard job={baseJob} isSelected={false} onSelect={() => {}} />);
    expect(screen.getByTestId("job-route")).toHaveTextContent("45 นาที ผ่าน BTS + BRT");
  });

  it("shows the commute-unavailable indicator when commutingMinutes is null (Req 4.5)", () => {
    const job: Job = { ...baseJob, commutingMinutes: null };
    render(<JobCard job={job} isSelected={false} onSelect={() => {}} />);
    expect(screen.queryByTestId("job-route")).not.toBeInTheDocument();
    expect(
      screen.getByText(strings[K.commuteUnavailable].th),
    ).toBeInTheDocument();
  });

  it("renders the monthly cost formatted via formatMonthlyCostTHB (Req 4.6)", () => {
    render(<JobCard job={baseJob} isSelected={false} onSelect={() => {}} />);
    expect(screen.getByTestId("job-cost")).toHaveTextContent(
      formatMonthlyCostTHB(1200),
    );
    // Sanity: thousands-grouped value present.
    expect(screen.getByTestId("job-cost")).toHaveTextContent("1,200");
  });

  it("renders exactly one work-model tag with the work model label (Req 4.7)", () => {
    render(<JobCard job={baseJob} isSelected={false} onSelect={() => {}} />);
    const tags = screen.getAllByTestId("work-model-tag");
    expect(tags).toHaveLength(1);
    expect(tags[0]).toHaveTextContent(strings[K.workModelHybrid].th);
  });

  it.each([
    ["On-site", K.workModelOnsite],
    ["Hybrid", K.workModelHybrid],
    ["Remote", K.workModelRemote],
  ] as const)(
    "maps workModel %s to a single localized tag",
    (workModel, key) => {
      const job: Job = { ...baseJob, workModel };
      render(<JobCard job={job} isSelected={false} onSelect={() => {}} />);
      const tags = screen.getAllByTestId("work-model-tag");
      expect(tags).toHaveLength(1);
      expect(tags[0]).toHaveTextContent(strings[key].th);
    },
  );

  it("marks the selected state distinctly (Req 4.8)", () => {
    const { rerender } = render(
      <JobCard job={baseJob} isSelected={false} onSelect={() => {}} />,
    );
    const card = screen.getByTestId("job-card");
    expect(card).toHaveAttribute("data-selected", "false");
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(card.className).not.toContain("ring-primary");

    rerender(<JobCard job={baseJob} isSelected onSelect={() => {}} />);
    expect(card).toHaveAttribute("data-selected", "true");
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(card.className).toContain("ring-primary");
  });

  it("calls onSelect with the job id when activated (Req 4.8)", () => {
    const onSelect = vi.fn();
    render(<JobCard job={baseJob} isSelected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("job-card"));
    expect(onSelect).toHaveBeenCalledWith("job-1");
  });

  it("keeps the work-model tag inside the card element", () => {
    render(<JobCard job={baseJob} isSelected={false} onSelect={() => {}} />);
    const card = screen.getByTestId("job-card");
    expect(within(card).getByTestId("work-model-tag")).toBeInTheDocument();
  });
});
