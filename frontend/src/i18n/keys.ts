// Feature: urbanfit-jobs-frontend
// Central registry of translation keys.
//
// Using a const object (instead of bare string literals scattered across the
// codebase) gives typo-safe references and lets the `T` component and
// resolveText be called with `I18nKey` values.

export const K = {
  // Product / shell
  productName: "product.name",
  navJobs: "nav.jobs",
  navAssessment: "nav.assessment",
  navRadar: "nav.radar",
  navHr: "nav.hr",
  navError: "nav.error",
  povCandidate: "pov.candidate",
  povHr: "pov.hr",

  // Screen 1 — Job Discovery
  discoveryTitle: "discovery.title",
  discoverySubtitle: "discovery.subtitle",
  residenceLabel: "discovery.residence.label",
  residencePlaceholder: "discovery.residence.placeholder",
  discoveryRoleTemplate: "discovery.role.template",
  discoveryResidenceContext: "discovery.residence.context",
  toleranceLabel: "discovery.tolerance.label",
  toleranceUnit: "discovery.tolerance.unit",
  jobsEmpty: "discovery.jobs.empty",
  lifestyleFitLabel: "discovery.job.lifestyleFit",
  commuteUnavailable: "discovery.job.commuteUnavailable",
  costPerMonth: "discovery.job.costPerMonth",
  workModelOnsite: "workModel.onsite",
  workModelHybrid: "workModel.hybrid",
  workModelRemote: "workModel.remote",

  // Transit map
  mapNoLocations: "map.noLocations",
  mapUnplottableCount: "map.unplottableCount",
  mapLegendBts: "map.legend.bts",
  mapLegendMrt: "map.legend.mrt",
  mapLegendBrt: "map.legend.brt",
  mapLegendTitle: "map.legend.title",

  // Screen 2 — Assessment
  assessmentTitle: "assessment.title",
  timerLabel: "assessment.timer.label",
  timeEnded: "assessment.timer.ended",
  contextEmpty: "assessment.context.empty",
  chatAiLabel: "assessment.chat.aiLabel",
  chatCandidateLabel: "assessment.chat.candidateLabel",
  chatPlaceholder: "assessment.chat.placeholder",
  chatSend: "assessment.chat.send",
  chatTyping: "assessment.chat.typing",
  codeEditorLabel: "assessment.code.label",
  codeSubmit: "assessment.code.submit",
  codeRequired: "assessment.code.required",

  // Screen 2 — Challenge selection (Req 2.3)
  challengeSelectionTitle: "assessment.challenge.selectionTitle",
  challengeSkillsLabel: "assessment.challenge.skillsLabel",
  challengeDifficultyLabel: "assessment.challenge.difficultyLabel",
  challenge1Title: "assessment.challenge.1.title",
  challenge1Description: "assessment.challenge.1.description",
  challenge1Skills: "assessment.challenge.1.skills",
  challenge1Difficulty: "assessment.challenge.1.difficulty",
  challenge2Title: "assessment.challenge.2.title",
  challenge2Description: "assessment.challenge.2.description",
  challenge2Skills: "assessment.challenge.2.skills",
  challenge2Difficulty: "assessment.challenge.2.difficulty",
  challenge3Title: "assessment.challenge.3.title",
  challenge3Description: "assessment.challenge.3.description",
  challenge3Skills: "assessment.challenge.3.skills",
  challenge3Difficulty: "assessment.challenge.3.difficulty",

  // Screen 3 — Radar
  radarTitle: "radar.title",
  radarSubtitle: "radar.subtitle",
  radarLegendCandidate: "radar.legend.candidate",
  radarLegendRequirement: "radar.legend.requirement",
  radarLegendMarket: "radar.legend.market",
  radarSeriesOmitted: "radar.seriesOmitted",
  adviceFindCourse: "radar.advice.findCourse",
  adviceNoGap: "radar.advice.noGap",
  adviceGapPrefix: "radar.advice.gapPrefix",
  adviceGapTemplate: "radar.advice.gapTemplate",

  // Screen 3 — Radar dashboard header + cards
  radarAppliedRoleTemplate: "radar.header.appliedRoleTemplate",
  radarOverallMatchLabel: "radar.header.overallMatchLabel",
  radarSkillDnaTitle: "radar.card.skillDnaTitle",
  radarTechnicalSkillsTitle: "radar.card.technicalSkillsTitle",
  radarUpskillPriorityTitle: "radar.card.upskillPriorityTitle",
  radarUpskillFindChallenge: "radar.card.upskillFindChallenge",
  radarRawDataTitle: "radar.card.rawDataTitle",
  radarSkillPassed: "radar.skill.passed",
  radarSkillFailed: "radar.skill.failed",

  // Screen 4 — HR Dashboard
  hrTitleTemplate: "hr.title.template",
  hrEmpty: "hr.empty",
  hrScheduleInterview: "hr.action.schedule",
  hrRejectAndReport: "hr.action.reject",
  hrScoreUnavailable: "hr.score.unavailable",
  hrSkillMatch: "hr.breakdown.skillMatch",
  hrCommutingFeasibility: "hr.breakdown.commutingFeasibility",
  hrUrbanFitLabel: "hr.breakdown.urbanFit",
  hrAiSummaryLabel: "hr.aiSummary.label",
} as const;

/** Union of every valid translation key. */
export type I18nKey = (typeof K)[keyof typeof K];
