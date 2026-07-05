// Feature: urbanfit-jobs-frontend
// Screen 2 — AI Roleplay Assessment (router entry).
//
// The real screen lives in ./assessment/AssessmentScreen (task 9.6). This
// module re-exports it under the named export `AssessmentScreen` so the
// router's lazy import path (which resolves the named `AssessmentScreen`
// export from `../screens/AssessmentScreen`) keeps working unchanged.

export { AssessmentScreen } from "./assessment/AssessmentScreen";
export type { AssessmentScreenProps } from "./assessment/AssessmentScreen";
