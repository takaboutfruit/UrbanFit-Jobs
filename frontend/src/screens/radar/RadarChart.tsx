// Feature: urbanfit-jobs-frontend
// Screen 3 — Market-Benchmarked Radar: RadarChart (task 11.1).
//
// Renders a Chart.js radar with a six-axis skill-dimension hexagon scaled
// 0-100 (Req 2.7), overlaying up to three series:
//   - Candidate  (#4edea3, primary accent)          Req 10.2
//   - Requirement (dotted gray line)                Req 10.3
//   - Market      (orange/tertiary color)           Req 10.4
// The Chart.js top legend labels all three series (Req 10.5 / 2.10 — exactly
// one legend region; the duplicate DOM legend has been removed). Any series
// whose data is unavailable (null) is omitted from the plot and reported in a
// visible message naming which series could not be shown (Req 10.6). Axis
// labels use larger, light-gray/white text for contrast (Req 2.8), and scale
// numbers render inside semi-transparent dark pills (Req 2.9).
//
// jsdom note: Chart.js needs a canvas 2D context which jsdom lacks. To keep this
// component testable, the chart data/config derivation lives in the PURE,
// framework-free `buildRadarChartConfig(data)` helper (no Chart.js import) that
// unit/property tests can exercise without rendering a canvas. The React
// component feeds that config to Chart.js inside a useEffect and guards against
// a missing 2D context so importing/rendering never crashes under jsdom.

import { useEffect, useRef } from "react";
import {
  Chart,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { clampPercent } from "../../domain";
import type { RadarData } from "../../domain";
import { K, strings } from "../../i18n";
import type { I18nKey } from "../../i18n";
import { resolveText } from "../../domain";

// Register only the pieces the radar chart needs (tree-shakeable Chart.js v4).
Chart.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

/** The three overlaid radar series, in fixed render order. */
export type RadarSeriesKey = "candidate" | "requirement" | "market";

/** Axis scale bounds for every radar axis (Req 10.1). */
export const RADAR_AXIS_MIN = 0;
export const RADAR_AXIS_MAX = 100;

/** Per-series plot colors (Req 10.2/10.3/10.4). */
export const RADAR_SERIES_COLORS: Record<RadarSeriesKey, string> = {
  candidate: "#4edea3", // primary accent (Req 10.2)
  requirement: "#8b949e", // gray, rendered dotted (Req 10.3)
  market: "#f0883e", // orange / tertiary (Req 10.4)
};

/** Translation key used for each series' legend label. */
export const RADAR_SERIES_LABEL_KEYS: Record<RadarSeriesKey, I18nKey> = {
  candidate: K.radarLegendCandidate,
  requirement: K.radarLegendRequirement,
  market: K.radarLegendMarket,
};

/** Fixed order the series are considered/plotted in. */
const SERIES_ORDER: RadarSeriesKey[] = ["candidate", "requirement", "market"];

/** A single derived dataset ready to hand to Chart.js. */
export interface RadarDatasetConfig {
  key: RadarSeriesKey;
  /** i18n key for the legend label (resolved by the component). */
  labelKey: I18nKey;
  /** Exactly one clamped value per dimension, in dimension order. */
  data: number[];
  borderColor: string;
  backgroundColor: string;
  /** Present (dashed) only for the Requirement series. */
  borderDash?: number[];
}

/** The pure, framework-free radar configuration. */
export interface RadarChartConfig {
  /** Axis labels = the chart's dimension list (>=3, Req 10.1). */
  labels: string[];
  /** One dataset per AVAILABLE series (nulls omitted). */
  datasets: RadarDatasetConfig[];
  /** Series omitted because their data was unavailable (Req 10.6). */
  omitted: RadarSeriesKey[];
  /** Axis scale bounds applied to every axis (Req 10.1). */
  scale: { min: number; max: number };
}

/**
 * Derive the radar chart configuration from a {@link RadarData} view model.
 *
 * Pure and dependency-free (no Chart.js), so it is unit/property testable
 * without a canvas. For each series present in `data` (in candidate,
 * requirement, market order) it produces exactly one clamped value per
 * dimension: `clampPercent(series.values[dimension])`, treating a missing
 * dimension value as 0. Any `null` series is omitted from `datasets` and its
 * key is recorded in `omitted` (Req 10.2-10.4, 10.6 / Property 12).
 *
 * @param data - The radar view model (dimensions + up to three series).
 * @returns A {@link RadarChartConfig} describing labels, datasets, and omissions.
 */
export function buildRadarChartConfig(data: RadarData): RadarChartConfig {
  const labels = [...data.dimensions];
  const datasets: RadarDatasetConfig[] = [];
  const omitted: RadarSeriesKey[] = [];

  for (const key of SERIES_ORDER) {
    const series = data[key];
    if (series == null) {
      omitted.push(key);
      continue;
    }

    // One clamped value per dimension; missing dimension value -> 0.
    const values = labels.map((dimension) =>
      clampPercent(series.values[dimension] ?? 0),
    );

    const color = RADAR_SERIES_COLORS[key];
    datasets.push({
      key,
      labelKey: RADAR_SERIES_LABEL_KEYS[key],
      data: values,
      borderColor: color,
      backgroundColor: hexToRgba(color, key === "requirement" ? 0 : 0.15),
      ...(key === "requirement" ? { borderDash: [4, 4] } : {}),
    });
  }

  return {
    labels,
    datasets,
    omitted,
    scale: { min: RADAR_AXIS_MIN, max: RADAR_AXIS_MAX },
  };
}

/** Convert a #rrggbb hex to an rgba() string with the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface RadarChartProps {
  /** The radar view model to plot. */
  data: RadarData;
  /** Optional extra classes for the outer wrapper. */
  className?: string;
}

/**
 * The market-benchmarked radar chart with a single Chart.js top legend and
 * an omitted-series message. The Chart.js canvas is initialized lazily in a
 * useEffect and guarded so it is a no-op when no 2D context is available
 * (e.g. under jsdom), keeping the component render-safe in tests.
 */
export function RadarChart({ data, className }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const config = buildRadarChartConfig(data);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    // jsdom lacks a real 2D context; bail out so tests never hit canvas ops.
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    chartRef.current = new Chart(canvas, {
      type: "radar",
      data: {
        labels: config.labels,
        datasets: config.datasets.map((d) => ({
          label: resolveText(d.labelKey, strings),
          data: d.data,
          borderColor: d.borderColor,
          backgroundColor: d.backgroundColor,
          borderDash: d.borderDash,
          pointBackgroundColor: d.borderColor,
          borderWidth: 2,
          fill: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: config.scale.min,
            max: config.scale.max,
            beginAtZero: true,
            // Larger, light-gray/white axis labels for contrast on the dark
            // background (Req 2.8).
            pointLabels: {
              color: "#f0f6fc",
              font: { size: 14 },
            },
            ticks: {
              stepSize: 20,
              // Scale numbers (20/40/60/80/100) rendered inside
              // semi-transparent dark pills so they don't clash with the
              // grid lines (Req 2.9).
              showLabelBackdrop: true,
              backdropColor: "rgba(13, 17, 23, 0.7)",
              backdropPadding: 4,
            },
          },
        },
        plugins: {
          // Exactly one legend region: the Chart.js top legend. The
          // duplicate DOM <ul> legend has been removed (Req 2.10).
          legend: { display: true, position: "top" },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // Re-create the chart whenever the derived config changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(config)]);

  const omittedLabels = config.omitted.map((key) =>
    resolveText(RADAR_SERIES_LABEL_KEYS[key], strings),
  );

  return (
    <div
      className={["w-full", className].filter(Boolean).join(" ")}
      data-testid="radar-chart"
    >
      <div className="relative mx-auto aspect-square w-full">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={resolveText(K.radarTitle, strings)}
          data-testid="radar-canvas"
        />
      </div>

      {/* Report which series could not be shown (Req 10.6). */}
      {config.omitted.length > 0 && (
        <p
          role="status"
          data-testid="radar-omitted-message"
          className="mt-space-sm text-center text-body-md text-on-surface-variant"
        >
          {resolveText(K.radarSeriesOmitted, strings)}
          {": "}
          {omittedLabels.join(", ")}
        </p>
      )}
    </div>
  );
}
