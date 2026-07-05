// Feature: urbanfit-jobs-frontend
// Shared view-model types.
//
// These are the shapes the frontend consumes (view models), not backend or
// database entities. Every screen and component is driven by these types.
// All scoring/route/AI computation happens upstream; the frontend renders
// what it is given and applies client-side ordering/filtering/formatting.

/** Work model shown as exactly one Work_Model_Tag on a Job Card (Req 4.7). */
export type WorkModel = "On-site" | "Hybrid" | "Remote";

/** A geographic point used for company pins and transit polylines. */
export interface Coordinate {
  lat: number;
  lng: number;
}

/** A single job rendered as a Job_Card and (when locatable) a Company_Pin. */
export interface Job {
  id: string;
  /** Non-empty job title (Req 4.3). */
  title: string;
  /** Non-empty company name; also the A→Z tiebreak key (Req 4.2, 4.3). */
  company: string;
  /** 0..100; primary ordering key, highest first (Req 4.1). */
  urbanFitScore: number;
  /** 0..100; shown with a progress indicator (Req 4.4). */
  lifestyleFitScore: number;
  /** Whole minutes; null = commuting time unavailable (Req 5.7). */
  commutingMinutes: number | null;
  /** e.g. "45 นาที ผ่าน BTS + BRT" (Req 4.5). */
  routeDescription: string;
  /** 0..999,999 baht/month; formatted via formatMonthlyCostTHB (Req 4.6). */
  monthlyTravelCostBaht: number;
  /** Exactly one work model (Req 4.7). */
  workModel: WorkModel;
  /** null = not plottable on the transit map (Req 5.2). */
  location: Coordinate | null;
}

/** Transit line kind; each type renders with a visually distinct style (Req 5.4). */
export type TransitLineType = "BTS" | "MRT" | "BRT";

/** A transit route overlaid on the Transit_Map with a legend entry (Req 5.4, 5.5). */
export interface TransitLine {
  type: TransitLineType;
  /** Legend label (Req 5.5). */
  name: string;
  /** Polyline points (Req 5.4). */
  path: Coordinate[];
}

/** Local interaction state owned by the Job Discovery screen. */
export interface DiscoveryState {
  /** Free text, <=100 chars (Req 6.1). */
  residenceText: string;
  /** 15..120 in steps of 5 (Req 6.2). */
  toleranceMinutes: number;
  /** id of the single selected job, or null when none (Req 4.8). */
  selectedJobId: string | null;
}

/** One message in the assessment chat history. */
export interface ChatMessage {
  id: string;
  sender: "ai" | "candidate";
  text: string;
  /** true while progressively rendering an AI response (Req 9.5). */
  streaming?: boolean;
}

/** Raw context data shown in the assessment left panel (Req 7.3). */
export interface ContextTable {
  /** Visible column headers (Req 7.3). */
  headers: string[];
  rows: string[][];
}

/** Local interaction state owned by the Assessment screen. */
export interface AssessmentState {
  prompt: {
    id: string;
    timeLimitSeconds: number;
    /** null = no context data for this prompt (Req 7.5). */
    contextTable: ContextTable | null;
  };
  /** Drives the PromptTimer display (Req 8.1). */
  remainingSeconds: number;
  timerRunning: boolean;
  messages: ChatMessage[];
  /** Answer code, <=20,000 chars (Req 9.7). */
  codeText: string;
}

/** One radar series: a value per skill dimension (Req 10.2-10.4). */
export interface RadarSeries {
  /** dimension name -> 0..100 score. */
  values: Record<string, number>;
}

/** All data needed to render the market-benchmarked radar report. */
export interface RadarData {
  /** >=3 labeled skill dimension axes (Req 10.1). */
  dimensions: string[];
  /** Candidate's own scores; null = series unavailable (Req 10.6). */
  candidate: RadarSeries | null;
  /** Company minimum requirement (benchmark A); null = unavailable. */
  requirement: RadarSeries | null;
  /** Market average (benchmark B); null = unavailable. */
  market: RadarSeries | null;
}

/** Candidate identity + application context shown in the Radar dashboard header. */
export interface CandidateProfile {
  /** Full candidate name. */
  name: string;
  /** The role the candidate applied for, e.g. "Backend Developer". */
  appliedRole: string;
  /** 0..100 overall match percentage against the applied role. */
  overallMatchScore: number;
}

/** One technical skill verified via automated checks, with a pass/fail outcome. */
export interface TechnicalSkillCheck {
  /** Skill name, e.g. "Python". */
  skill: string;
  /** Whether the automated check passed. */
  passed: boolean;
}

/** Priority of an upskill recommendation, driving its visual treatment. */
export type UpskillPriority = "high" | "medium";

/** One upskill recommendation derived from a skill gap in the radar data. */
export interface UpskillRecommendation {
  /** Main text naming the skill and the gap, e.g. "ทักษะ Data Cleaning (ต่ำกว่าค่าเฉลี่ยตลาด 18%)". */
  label: string;
  /** Optional supporting text, e.g. a suggested learning action. */
  subtext?: string;
  priority: UpskillPriority;
}

/** One raw performance metric shown in the stat-box grid. */
export interface RawMetric {
  /** Metric name, e.g. "เวลาที่ใช้ก่อนเริ่มเขียน". */
  label: string;
  /** Pre-formatted display value, e.g. "45s". */
  value: string;
}

/** One shortlisted candidate rendered as a Candidate_Card. */
export interface CandidateSummary {
  id: string;
  name: string;
  /** 0..100; null = show placeholder instead of a value (Req 13.9). */
  urbanFitScore: number | null;
  /** 0..100; null = show placeholder (Req 13.9). */
  skillMatch: number | null;
  /** 0..100; null = show placeholder (Req 13.9). */
  commutingFeasibility: number | null;
  /** Scrollable behavior/ability summary shown instead of a resume (Req 13.3). */
  aiSummary: string;
}

/** The zero-filter HR shortlist view model. */
export interface HRShortlist {
  /** Target job role used in the title (Req 12.1). */
  targetRole: string;
  candidates: CandidateSummary[];
}

// ---------------------------------------------------------------------------
// Internationalization (Thai-first with default-text fallback)
// ---------------------------------------------------------------------------

/**
 * A single translatable UI string.
 *
 * `th` is the Thai text. It may be an empty string when a translation has not
 * yet been provided. `default` is the guaranteed non-empty fallback text used
 * whenever `th` is missing/blank. `default` MUST always be non-empty so that
 * `resolveText` (task 2.13) can honor Property 17: it never returns an empty
 * string and never returns the raw key.
 */
export interface I18nEntry {
  /** Thai translation; may be "" when not yet translated. */
  th: string;
  /** Non-empty default/fallback text. Never empty. */
  default: string;
}

/**
 * The Thai-first string table: a mapping of translation key -> entry.
 *
 * resolveText(key, table) resolution contract (implemented in task 2.13,
 * consumed by the `T` component in task 4.1):
 *   1. If `table[key].th` has non-whitespace content -> return it.
 *   2. Else if `table[key].default` is non-empty -> return it.
 *   3. If `key` is absent from the table -> return DEFAULT_FALLBACK_TEXT.
 * The result is therefore always a non-empty string and never the raw key
 * (Property 17 / Req 1.9).
 */
export type I18nTable = Record<string, I18nEntry>;
