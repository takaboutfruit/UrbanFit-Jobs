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
export {
  SAMPLE_TRANSIT_LINES,
  TRANSIT_STYLE,
  TRANSIT_TYPES,
} from "./transit-lines";
export type { TransitStyle } from "./transit-lines";
