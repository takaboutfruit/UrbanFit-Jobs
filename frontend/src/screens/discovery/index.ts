// Feature: urbanfit-jobs-frontend
// Barrel for Screen 1 (Job Discovery) components.
//
// This folder is owned by the discovery tasks (7.x). Each component lives in
// its own file to avoid write-conflicts across concurrent screen tasks.

export { ResidenceInput, capResidence, RESIDENCE_MAX_LENGTH } from "./ResidenceInput";
export type { ResidenceInputProps } from "./ResidenceInput";
export {
  ToleranceSlider,
  TOLERANCE_MIN,
  TOLERANCE_MAX,
  TOLERANCE_STEP,
} from "./ToleranceSlider";
export type { ToleranceSliderProps } from "./ToleranceSlider";
export { DiscoveryHeader } from "./DiscoveryHeader";
export type { DiscoveryHeaderProps } from "./DiscoveryHeader";
export { FitBadges } from "./FitBadges";
export type { FitBadgesProps } from "./FitBadges";
export { PrimaryRow } from "./PrimaryRow";
export type { PrimaryRowProps } from "./PrimaryRow";
export { SalaryTag } from "./SalaryTag";
export type { SalaryTagProps } from "./SalaryTag";
export { TransitChainRow } from "./TransitChainRow";
export type { TransitChainRowProps } from "./TransitChainRow";
export { JobMetaRow } from "./JobMetaRow";
export type { JobMetaRowProps } from "./JobMetaRow";
export { FinancialComparisonRow } from "./FinancialComparisonRow";
export type { FinancialComparisonRowProps } from "./FinancialComparisonRow";
export { JobCard } from "./JobCard";
export type { JobCardProps } from "./JobCard";
export { JobList } from "./JobList";
export type { JobListProps } from "./JobList";
export {
  TransitMap,
  partitionJobsByCoordinate,
  BANGKOK_CENTER,
  BANGKOK_ZOOM,
  MOBILE_BREAKPOINT_PX,
} from "./TransitMap";
export type { TransitMapProps, JobCoordinatePartition } from "./TransitMap";
export { CompanyPin, buildPinIcon } from "./CompanyPin";
export type { CompanyPinProps } from "./CompanyPin";
export { HomePin, buildHomePinIcon } from "./HomePin";
export type { HomePinProps } from "./HomePin";
export { IsochroneOverlay, ISOCHRONE_COLOR, ISOCHRONE_FILL_OPACITY } from "./IsochroneOverlay";
export type { IsochroneOverlayProps } from "./IsochroneOverlay";
export { BoundaryLabel } from "./BoundaryLabel";
export type { BoundaryLabelProps } from "./BoundaryLabel";
export { ViewportWatcher, VIEWPORT_WATCHER_DEBOUNCE_MS } from "./ViewportWatcher";
export type { ViewportWatcherProps } from "./ViewportWatcher";
export {
  SAMPLE_TRANSIT_LINES,
  TRANSIT_STYLE,
  TRANSIT_TYPES,
} from "./transit-lines";
export type { TransitStyle } from "./transit-lines";
