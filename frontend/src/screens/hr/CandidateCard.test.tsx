// Feature: urbanfit-jobs-frontend
// Component tests for CandidateCard (Req 13.1–13.10).

import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { CandidateCard } from "./CandidateCard";
import type { CandidateSummary } from "../../domain";
import { strings } from "../../i18n";
import { K } from "../../i18n";

const scheduleText = strings[K.hrScheduleInterview].th;
const rejectText = strings[K.hrRejectAndReport].th;
const unavailableText = strings[K.hrScoreUnavailable].th;

function makeCandidate(overrides: Partial<CandidateSummary> = {}): CandidateSummary {
  return {
    id: "cand-1",
    name: "สมชาย ใจดี",
    urbanFitScore: 87,
    skillMatch: 92,
    commutingFeasibility: 74,
    aiSummary: "ผู้สมัครแสดงทักษะการวิเคราะห์ข้อมูลได้ดีเยี่ยม",
    ...overrides,
  };
}

describe("CandidateCard", () => {
  it("renders the overall Urban-Fit Score as the largest text (headline size)", () => {
    render(
      <CandidateCard
        candidate={makeCandidate({ urbanFitScore: 87 })}
        onScheduleInterview={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const overall = screen.getByTestId("overall-score");
    expect(overall).toHaveTextContent("87%");
    // Largest typographic size on the card (Req 13.1).
    expect(overall).toHaveClass("text-headline-lg");

    // No other element uses a larger/equal headline size.
    const card = screen.getByTestId("candidate-card");
    const headlineEls = card.querySelectorAll(".text-headline-lg");
    expect(headlineEls.length).toBe(1);
    expect(headlineEls[0]).toBe(overall);
  });

  it("clamps the overall score to a whole-number percent", () => {
    render(
      <CandidateCard
        candidate={makeCandidate({ urbanFitScore: 66.6 })}
        onScheduleInterview={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByTestId("overall-score")).toHaveTextContent("67%");
  });

  it("renders skill match and commuting feasibility progress bars with matching values", () => {
    render(
      <CandidateCard
        candidate={makeCandidate({ skillMatch: 92, commutingFeasibility: 74 })}
        onScheduleInterview={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const fills = screen.getAllByTestId("progress-fill");
    const values = fills.map((f) => f.getAttribute("data-value"));
    expect(values).toContain("92");
    expect(values).toContain("74");
  });

  it("renders the placeholder for each unavailable score instead of a value/bar", () => {
    render(
      <CandidateCard
        candidate={makeCandidate({
          urbanFitScore: null,
          skillMatch: null,
          commutingFeasibility: null,
        })}
        onScheduleInterview={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    // Overall placeholder in place of the headline value.
    const overall = screen.getByTestId("overall-score");
    expect(overall).toHaveTextContent(unavailableText);
    expect(overall).not.toHaveTextContent("%");

    // No progress bars are rendered when both breakdown scores are null.
    expect(screen.queryAllByTestId("progress-fill")).toHaveLength(0);

    // The unavailable text appears for overall + both breakdowns (3 times).
    expect(screen.getAllByText(unavailableText)).toHaveLength(3);
  });

  it("renders the AI summary in a scrollable box (overflow-y-auto + max-height)", () => {
    render(
      <CandidateCard
        candidate={makeCandidate()}
        onScheduleInterview={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const box = screen.getByTestId("ai-summary");
    expect(box).toHaveClass("overflow-y-auto");
    expect(box.className).toMatch(/max-h-/);
    expect(box).toHaveTextContent("ผู้สมัครแสดงทักษะการวิเคราะห์ข้อมูลได้ดีเยี่ยม");
  });

  it("renders both action buttons with correct color treatments", () => {
    render(
      <CandidateCard
        candidate={makeCandidate()}
        onScheduleInterview={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const schedule = screen.getByTestId("schedule-button");
    const reject = screen.getByTestId("reject-button");

    expect(schedule).toHaveTextContent(scheduleText);
    expect(schedule).toHaveClass("bg-primary");

    expect(reject).toHaveTextContent(rejectText);
    expect(reject).toHaveClass("bg-error");
  });

  it("fires onScheduleInterview with the candidate id and shows activation feedback", () => {
    const onSchedule = vi.fn();
    render(
      <CandidateCard
        candidate={makeCandidate({ id: "cand-42" })}
        onScheduleInterview={onSchedule}
        onReject={vi.fn()}
      />,
    );
    const schedule = screen.getByTestId("schedule-button");
    expect(schedule).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(schedule);

    expect(onSchedule).toHaveBeenCalledTimes(1);
    expect(onSchedule).toHaveBeenCalledWith("cand-42");
    // Activation feedback (Req 13.10).
    expect(schedule).toHaveAttribute("data-activated", "true");
    expect(schedule).toHaveAttribute("aria-pressed", "true");
  });

  it("fires onReject with the candidate id and shows activation feedback", () => {
    const onReject = vi.fn();
    render(
      <CandidateCard
        candidate={makeCandidate({ id: "cand-7" })}
        onScheduleInterview={vi.fn()}
        onReject={onReject}
      />,
    );
    const reject = screen.getByTestId("reject-button");
    expect(reject).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(reject);

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledWith("cand-7");
    // Activation feedback (Req 13.10).
    expect(reject).toHaveAttribute("data-activated", "true");
    expect(reject).toHaveAttribute("aria-pressed", "true");
  });

  it("scopes the schedule button feedback so the reject button is not marked activated", () => {
    render(
      <CandidateCard
        candidate={makeCandidate()}
        onScheduleInterview={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("schedule-button"));
    const reject = within(screen.getByTestId("candidate-card")).getByTestId("reject-button");
    expect(reject).not.toHaveAttribute("data-activated");
    expect(reject).toHaveAttribute("aria-pressed", "false");
  });
});
