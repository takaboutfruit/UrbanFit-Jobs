// Feature: urbanfit-ui-fixes (bugfix)
// Preservation property tests for AdviceAlert's skill-gap / no-gap behavior
// (task 2).
//
// Observation-first methodology: these properties observe AdviceAlert's
// rendered output across randomly generated candidate/benchmark maps —
// including inputs with an actual shortfall and inputs where the candidate
// meets or exceeds every benchmark dimension — exactly as the current
// unfixed code behaves. They MUST PASS on the unfixed code — locking in the
// skill-gap warning (with the "ค้นหาคอร์สอัปสกิล" CTA) and the no-gap
// confirmation baseline the two-column Radar layout fix (task 3.3) must not
// change (Req 3.6).
//
// **Validates: Requirements 3.6** (Preservation — Property 2, design.md)

import { describe, it, expect } from "vitest";
import { render, within, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fc from "fast-check";
import { AdviceAlert } from "./AdviceAlert";
import { largestShortfall, resolveText } from "../../domain";
import { strings, K } from "../../i18n";

const BENCHMARK_LABEL = resolveText(K.radarLegendMarket, strings);
const CTA_TEXT = resolveText(K.adviceFindCourse, strings);
const NO_GAP_TEXT = resolveText(K.adviceNoGap, strings);

function renderAlert(
  candidate: Record<string, number>,
  benchmark: Record<string, number>,
) {
  return render(
    <MemoryRouter initialEntries={["/radar"]}>
      <AdviceAlert
        candidate={candidate}
        benchmark={benchmark}
        benchmarkLabel={BENCHMARK_LABEL}
        onFindCourses={() => {}}
      />
    </MemoryRouter>,
  );
}

/** A map of 2-5 distinct dimension names to scores in [0, 100]. */
const dimensionMapArb = fc
  .uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), {
    minLength: 2,
    maxLength: 5,
  })
  .chain((dims) =>
    fc
      .array(fc.integer({ min: 0, max: 100 }), {
        minLength: dims.length,
        maxLength: dims.length,
      })
      .map((values) => Object.fromEntries(dims.map((d, i) => [d, values[i]]))),
  );

describe("Preservation 3.6 — skill-gap warning shown iff largestShortfall finds a gap", () => {
  it("for any candidate/benchmark map pair, AdviceAlert shows the gap message with the CTA exactly when largestShortfall is non-null, and the no-gap confirmation exactly when it is null", () => {
    fc.assert(
      fc.property(dimensionMapArb, dimensionMapArb, (candidate, benchmark) => {
        try {
          const { container } = renderAlert(candidate, benchmark);
          const gap = largestShortfall(candidate, benchmark);

          if (gap === null) {
            const noGap = within(container).getByTestId("advice-no-gap");
            expect(noGap.textContent).toContain(NO_GAP_TEXT);
            expect(
              within(container).queryByTestId("advice-gap-message"),
            ).toBeNull();
            expect(
              within(container).queryByTestId("advice-find-courses"),
            ).toBeNull();
          } else {
            const message = within(container).getByTestId("advice-gap-message");
            expect(message.textContent).toContain(gap.dimension);
            expect(message.textContent).toContain(BENCHMARK_LABEL);
            expect(message.textContent).toContain(
              `${Math.round(gap.shortfall)}%`,
            );

            const cta = within(container).getByTestId("advice-find-courses");
            expect(cta).toBeEnabled();
            expect(cta.textContent).toContain(CTA_TEXT);
            expect(within(container).queryByTestId("advice-no-gap")).toBeNull();
          }
        } finally {
          cleanup();
        }
      }),
      { numRuns: 40 },
    );
  });

  it("keeps the gap message in the warning treatment and the no-gap message in the status role, for any pair", () => {
    fc.assert(
      fc.property(dimensionMapArb, dimensionMapArb, (candidate, benchmark) => {
        try {
          const { container } = renderAlert(candidate, benchmark);
          const gap = largestShortfall(candidate, benchmark);

          if (gap === null) {
            expect(
              within(container).getByTestId("advice-no-gap"),
            ).toHaveAttribute("role", "status");
          } else {
            const message = within(container).getByTestId("advice-gap-message");
            expect(message).toHaveAttribute("role", "alert");
            expect(message.className).toContain("text-warning");
          }
        } finally {
          cleanup();
        }
      }),
      { numRuns: 40 },
    );
  });
});
