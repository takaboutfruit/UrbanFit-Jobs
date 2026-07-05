// Feature: urbanfit-ui-fixes (bugfix)
// Preservation property tests for buildRadarChartConfig (task 2).
//
// Observation-first methodology: buildRadarChartConfig is pure, so these
// properties directly assert on its output across randomly generated
// RadarData (varied dimensions, series values including out-of-range/missing,
// and null series) exactly as observed on the current unfixed code. They MUST
// PASS on the unfixed code — locking in the series colors, dashed
// requirement line, 0-100 clamping, and null-series omission contract the
// six-axis / readability fix (task 3.3) must NOT change (Req 3.5).
//
// **Validates: Requirements 3.5** (Preservation — Property 2, design.md)

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  buildRadarChartConfig,
  RADAR_SERIES_COLORS,
  RADAR_AXIS_MIN,
  RADAR_AXIS_MAX,
} from "./RadarChart";
import { clampPercent } from "../../domain";
import type { RadarData, RadarSeries } from "../../domain";

/** Distinct, non-empty dimension name generator (2-6 dimensions). */
const dimensionsArb = fc
  .uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), {
    minLength: 2,
    maxLength: 6,
  });

/** A raw (unclamped) numeric value: can be out of [0,100], fractional, or NaN-free. */
const rawValueArb = fc.oneof(
  fc.integer({ min: -500, max: 500 }),
  fc.double({ min: -500, max: 500, noNaN: true }),
);

/** Build a RadarSeries with a value for every dimension (no missing keys). */
function seriesArbFor(dimensions: string[]): fc.Arbitrary<RadarSeries> {
  return fc
    .array(rawValueArb, { minLength: dimensions.length, maxLength: dimensions.length })
    .map((values) => ({
      values: Object.fromEntries(dimensions.map((d, i) => [d, values[i]])),
    }));
}

/** A series, possibly null (unavailable), possibly missing some dimension keys. */
function nullableSeriesArbFor(dimensions: string[]): fc.Arbitrary<RadarSeries | null> {
  return fc.oneof(
    { weight: 3, arbitrary: seriesArbFor(dimensions) },
    { weight: 1, arbitrary: fc.constant(null) },
  );
}

const radarDataArb: fc.Arbitrary<RadarData> = dimensionsArb.chain((dimensions) =>
  fc.record({
    candidate: nullableSeriesArbFor(dimensions),
    requirement: nullableSeriesArbFor(dimensions),
    market: nullableSeriesArbFor(dimensions),
  }).map((series) => ({ dimensions, ...series })),
);

describe("Preservation 3.5 — axis scale stays fixed at 0-100 for any RadarData", () => {
  it("scale.min/max is always {0, 100} regardless of input values", () => {
    fc.assert(
      fc.property(radarDataArb, (data) => {
        const config = buildRadarChartConfig(data);
        expect(config.scale).toEqual({ min: RADAR_AXIS_MIN, max: RADAR_AXIS_MAX });
      }),
      { numRuns: 40 },
    );
  });
});

describe("Preservation 3.5 — every plotted value is clampPercent-clamped into 0-100", () => {
  it("each dataset's data array equals clampPercent applied per-dimension (missing -> 0)", () => {
    fc.assert(
      fc.property(radarDataArb, (data) => {
        const config = buildRadarChartConfig(data);
        for (const dataset of config.datasets) {
          const series = data[dataset.key];
          expect(series).not.toBeNull();
          const expected = data.dimensions.map((dim) =>
            clampPercent(series!.values[dim] ?? 0),
          );
          expect(dataset.data).toEqual(expected);
          for (const v of dataset.data) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(100);
          }
        }
      }),
      { numRuns: 40 },
    );
  });
});

describe("Preservation 3.5 — series colors and dashed requirement line are fixed", () => {
  it("candidate/requirement/market keep their fixed colors, and only requirement is dashed", () => {
    fc.assert(
      fc.property(radarDataArb, (data) => {
        const config = buildRadarChartConfig(data);
        for (const dataset of config.datasets) {
          expect(dataset.borderColor).toBe(RADAR_SERIES_COLORS[dataset.key]);
          if (dataset.key === "requirement") {
            expect(dataset.borderDash).toEqual([4, 4]);
          } else {
            expect(dataset.borderDash).toBeUndefined();
          }
        }
      }),
      { numRuns: 40 },
    );
  });
});

describe("Preservation 3.5 — null series are omitted and reported; present series are not", () => {
  it("datasets contain exactly the non-null series, and omitted contains exactly the null series, both partitioning candidate/requirement/market", () => {
    fc.assert(
      fc.property(radarDataArb, (data) => {
        const config = buildRadarChartConfig(data);
        const datasetKeys = new Set(config.datasets.map((d) => d.key));
        const omittedKeys = new Set(config.omitted);

        for (const key of ["candidate", "requirement", "market"] as const) {
          if (data[key] === null) {
            expect(omittedKeys.has(key)).toBe(true);
            expect(datasetKeys.has(key)).toBe(false);
          } else {
            expect(datasetKeys.has(key)).toBe(true);
            expect(omittedKeys.has(key)).toBe(false);
          }
        }

        // Every dataset key is unique and every omitted key is unique.
        expect(config.datasets.length).toBe(datasetKeys.size);
        expect(config.omitted.length).toBe(omittedKeys.size);
      }),
      { numRuns: 40 },
    );
  });

  it("labels always equal data.dimensions verbatim, in order", () => {
    fc.assert(
      fc.property(radarDataArb, (data) => {
        const config = buildRadarChartConfig(data);
        expect(config.labels).toEqual(data.dimensions);
      }),
      { numRuns: 40 },
    );
  });
});
