// Feature: urbanfit-jobs-frontend
// Thai-first UI string table.
//
// Every entry provides a Thai (`th`) string and a guaranteed non-empty
// `default` fallback. resolveText (task 2.13) returns `th` when present,
// otherwise `default`, and for an unknown key returns DEFAULT_FALLBACK_TEXT —
// so the resolved text is never empty and never a raw key (Req 1.9 / Property 17).

import type { I18nTable } from "../domain/types";
import { K } from "./keys";

/**
 * Global fallback used only when a requested key does not exist in the table
 * at all. Non-empty by construction so Property 17 always holds.
 */
export const DEFAULT_FALLBACK_TEXT = "…";

export const strings: I18nTable = {
  // Product / shell
  [K.productName]: { th: "UrbanFit Jobs", default: "UrbanFit Jobs" },
  [K.navJobs]: { th: "ค้นหางาน", default: "Job Discovery" },
  [K.navAssessment]: { th: "แบบประเมิน", default: "Assessment" },
  [K.navRadar]: { th: "เรดาร์ทักษะ", default: "Radar" },
  [K.navHr]: { th: "แดชบอร์ด HR", default: "HR Dashboard" },
  [K.navError]: {
    th: "ไม่สามารถเปิดหน้าที่เลือกได้",
    default: "Could not open the selected destination",
  },
  [K.povCandidate]: { th: "มุมมองผู้สมัคร", default: "Candidate view" },
  [K.povHr]: { th: "มุมมอง HR", default: "HR view" },

  // Screen 1 — Job Discovery
  [K.discoveryTitle]: { th: "ค้นหางานที่ใช่สำหรับคุณ", default: "Discover jobs that fit you" },
  [K.discoverySubtitle]: {
    th: "จัดอันดับด้วยคะแนน Urban-Fit จากทักษะและการเดินทางจริง",
    default: "Ranked by Urban-Fit Score from skills and real commuting data",
  },
  [K.residenceLabel]: { th: "ที่พักอาศัย", default: "Residence" },
  [K.residencePlaceholder]: {
    th: "ระบุที่พักอาศัยในกรุงเทพฯ",
    default: "Enter your residence in Bangkok",
  },
  // Pre-selected role context header (replaces the search input). {role} is
  // interpolated at render time, e.g. "ตำแหน่งที่แนะนำ: Data Analyst".
  [K.discoveryRoleTemplate]: {
    th: "ตำแหน่งที่แนะนำ: {role}",
    default: "Recommended role: {role}",
  },
  [K.discoveryResidenceContext]: {
    th: "อ้างอิงจากที่พักของคุณ",
    default: "Based on your residence",
  },
  [K.toleranceLabel]: {
    th: "ระยะเวลาเดินทางสูงสุดที่รับได้",
    default: "Maximum acceptable commute time",
  },
  [K.toleranceUnit]: { th: "นาที", default: "minutes" },
  [K.jobsEmpty]: {
    th: "ไม่พบงานที่ตรงกับเงื่อนไขของคุณ",
    default: "No matching jobs were found",
  },
  [K.lifestyleFitLabel]: { th: "ความเหมาะสมกับไลฟ์สไตล์", default: "Lifestyle Fit" },
  [K.commuteUnavailable]: { th: "ไม่มีข้อมูลเวลาเดินทาง", default: "Commuting time unavailable" },
  [K.costPerMonth]: { th: "บ./เดือน", default: "THB/month" },
  [K.workModelOnsite]: { th: "ทำงานที่ออฟฟิศ", default: "On-site" },
  [K.workModelHybrid]: { th: "ไฮบริด", default: "Hybrid" },
  [K.workModelRemote]: { th: "ทำงานทางไกล", default: "Remote" },
  [K.jobTitleUnavailable]: {
    th: "ไม่มีชื่อตำแหน่งงาน",
    default: "Job title unavailable",
  },
  [K.companyNameUnavailable]: {
    th: "ไม่มีชื่อบริษัท",
    default: "Company name unavailable",
  },
  [K.discoveryLoading]: {
    th: "กำลังค้นหางาน...",
    default: "Searching for jobs...",
  },
  [K.discoveryErrorMessage]: {
    th: "ไม่สามารถโหลดรายการงานได้ กรุณาลองใหม่",
    default: "Could not load jobs. Please try again.",
  },
  [K.discoveryRetryAction]: {
    th: "ลองใหม่",
    default: "Retry",
  },

  // Screen 1 — Map-First Job Discovery (job-discovery-map-first)
  [K.discoveryMapTitle]: {
    th: "หางานใกล้บ้านภายใน 20 นาที",
    default: "Find jobs within a 20-minute commute",
  },
  [K.discoveryMapSubtitle]: {
    th: "เพื่อคุณภาพชีวิตที่ดียิ่งขึ้น",
    default: "For a better quality of life",
  },
  [K.perTripUnit]: { th: "เที่ยว", default: "trip" },
  [K.commuteFitLabel]: { th: "ความเหมาะสมด้านการเดินทาง", default: "Commute Fit" },
  [K.skillFitLabel]: { th: "ความเหมาะสมด้านทักษะ", default: "Skill Fit" },
  [K.fitUnavailable]: { th: "ไม่มีข้อมูล", default: "N/A" },
  [K.homeNotSet]: {
    th: "ยังไม่ได้ตั้งค่าตำแหน่งบ้าน",
    default: "Home location is not set",
  },
  [K.transitModeWalk]: { th: "เดิน", default: "Walk" },
  [K.transitModeBts]: { th: "BTS", default: "BTS" },
  [K.transitModeMrt]: { th: "MRT", default: "MRT" },

  // Screen 1 — Financial comparison row (job-card-financial-metrics)
  [K.salaryLabel]: { th: "เงินเดือน", default: "Salary" },
  [K.monthlyCommuteCostLabel]: { th: "ค่าเดินทาง", default: "Commute cost" },
  [K.perMonthUnit]: { th: "เดือน", default: "month" },
  // {percent} placeholder, e.g. "5.5% ของเงินเดือน" (Req: unambiguous ratio).
  [K.percentOfSalaryLabel]: {
    th: "{percent}% ของเงินเดือน",
    default: "{percent}% of salary",
  },
  [K.commuteFitBadgeLabel]: { th: "การเดินทาง", default: "Commute" },
  [K.skillFitBadgeLabel]: { th: "ทักษะที่ตรง", default: "Skill match" },

  // Screen 1 — Work flexibility badge + qualifications subtitle
  // (job-card-qualifications)
  [K.workFlexibilityOnsite]: { th: "ทำงานที่ออฟฟิศ", default: "On-site" },
  // {days} placeholder: number of work-from-home days per week (Req: "Hybrid
  // (WFH 3 days)").
  [K.workFlexibilityHybridTemplate]: {
    th: "ไฮบริด (WFH {days} วัน)",
    default: "Hybrid (WFH {days} days)",
  },
  [K.workFlexibilityRemote]: { th: "ทำงานทางไกล", default: "Remote" },
  // {years} and {growth} placeholders, e.g.
  // "ประสบการณ์ที่ต้องการ: 3 ปี • โอกาสเติบโต: High".
  [K.qualificationsSubtitleTemplate]: {
    th: "ประสบการณ์ที่ต้องการ: {years} ปี • โอกาสเติบโต: {growth}",
    default: "Experience required: {years} years • Growth: {growth}",
  },
  [K.careerGrowthHigh]: { th: "สูง", default: "High" },
  [K.careerGrowthMedium]: { th: "ปานกลาง", default: "Medium" },
  [K.careerGrowthStable]: { th: "คงที่", default: "Stable" },
  [K.qualificationsUnavailable]: { th: "ไม่มีข้อมูล", default: "N/A" },

  // Transit map
  [K.mapNoLocations]: {
    th: "ไม่มีข้อมูลตำแหน่งบริษัท",
    default: "No company locations are available",
  },
  [K.mapUnplottableCount]: {
    th: "มีงานที่ไม่สามารถแสดงบนแผนที่ได้",
    default: "jobs could not be plotted on the map",
  },
  [K.mapLegendTitle]: { th: "เส้นทางขนส่งมวลชน", default: "Transit routes" },
  [K.mapLegendBts]: { th: "รถไฟฟ้า BTS", default: "BTS" },
  [K.mapLegendMrt]: { th: "รถไฟฟ้าใต้ดิน MRT", default: "MRT" },
  [K.mapLegendBrt]: { th: "รถโดยสารด่วน BRT", default: "BRT" },

  // Screen 2 — Assessment
  [K.assessmentTitle]: { th: "แบบประเมินทักษะแบบสวมบทบาท", default: "AI Roleplay Assessment" },
  [K.timerLabel]: { th: "เวลาที่เหลือสำหรับโจทย์นี้", default: "Time remaining for this prompt" },
  [K.timeEnded]: { th: "หมดเวลาสำหรับโจทย์นี้แล้ว", default: "Time for this prompt has ended" },
  [K.contextEmpty]: {
    th: "ไม่มีข้อมูลประกอบสำหรับโจทย์นี้",
    default: "No context data available",
  },
  [K.chatAiLabel]: { th: "ผู้ช่วย AI", default: "AI" },
  [K.chatCandidateLabel]: { th: "ผู้สมัคร", default: "Candidate" },
  [K.chatPlaceholder]: { th: "พิมพ์ข้อความของคุณ", default: "Type your message" },
  [K.chatSend]: { th: "ส่ง", default: "Send" },
  [K.chatTyping]: { th: "ผู้ช่วย AI กำลังพิมพ์…", default: "AI is typing…" },
  [K.codeEditorLabel]: { th: "โค้ดคำตอบ", default: "Answer code" },
  [K.codeSubmit]: { th: "ส่งคำตอบ", default: "Submit answer" },
  [K.codeRequired]: {
    th: "จำเป็นต้องกรอกโค้ดคำตอบ",
    default: "Non-empty answer code is required",
  },

  // Screen 2 — Challenge selection (Req 2.3)
  [K.challengeSelectionTitle]: {
    th: "เลือกโจทย์ที่ต้องการทำ",
    default: "Choose a challenge",
  },
  [K.challengeSkillsLabel]: { th: "ทักษะที่ต้องใช้", default: "Required Skills" },
  [K.challengeDifficultyLabel]: { th: "ความยาก", default: "Difficulty" },
  [K.challenge1Title]: { th: "วิเคราะห์ข้อมูลฝุ่น PM 2.5", default: "Analyze PM 2.5 dust data" },
  [K.challenge1Description]: {
    th: "ทำความสะอาดและหาค่าเฉลี่ยฝุ่น PM 2.5 จาก API ของ กทม.",
    default: "Clean and average PM 2.5 data from the BMA API",
  },
  [K.challenge1Skills]: { th: "Python, Pandas", default: "Python, Pandas" },
  [K.challenge1Difficulty]: { th: "ปานกลาง", default: "Medium" },
  [K.challenge2Title]: { th: "ปรับปรุง Query ฐานข้อมูล", default: "Optimize a database query" },
  [K.challenge2Description]: {
    th: "ลดเวลาการดึงข้อมูลการจราจรจากฐานข้อมูลที่มีขนาดใหญ่",
    default: "Reduce retrieval time for traffic data from a large database",
  },
  [K.challenge2Skills]: {
    th: "SQL, Database Optimization",
    default: "SQL, Database Optimization",
  },
  [K.challenge2Difficulty]: { th: "ยาก", default: "Hard" },
  [K.challenge3Title]: { th: "สร้าง Dashboard สรุปยอด", default: "Build a summary dashboard" },
  [K.challenge3Description]: {
    th: "สรุปข้อมูลการเดินทางของพนักงานในรูปแบบที่เข้าใจง่าย",
    default: "Summarize employee commute data in an easy-to-understand format",
  },
  [K.challenge3Skills]: { th: "Data Visualization", default: "Data Visualization" },
  [K.challenge3Difficulty]: { th: "ง่าย", default: "Easy" },

  // Screen 3 — Radar
  [K.radarTitle]: { th: "เรดาร์เทียบทักษะกับตลาด", default: "Market-Benchmarked Radar" },
  [K.radarSubtitle]: {
    th: "เปรียบเทียบทักษะของคุณกับข้อกำหนดของบริษัทและค่าเฉลี่ยตลาด",
    default: "Compare your skills against company requirements and the market",
  },
  [K.radarLegendCandidate]: { th: "คะแนนของคุณ", default: "Candidate" },
  [K.radarLegendRequirement]: { th: "ข้อกำหนดของบริษัท", default: "Requirement" },
  [K.radarLegendMarket]: { th: "ค่าเฉลี่ยตลาด", default: "Market" },
  [K.radarSeriesOmitted]: {
    th: "ไม่สามารถแสดงข้อมูลบางชุดได้",
    default: "Some series could not be shown",
  },
  [K.adviceFindCourse]: { th: "ค้นหาคอร์สอัปสกิล", default: "Find upskilling courses" },
  [K.adviceNoGap]: {
    th: "ทักษะของคุณผ่านเกณฑ์ในทุกด้าน",
    default: "Your skills meet the benchmark on every dimension",
  },
  // Skill-gap advice message parts. The dimension name, benchmark label, and
  // shortfall percentage are dynamic, so the message is composed in the
  // AdviceAlert component from this prefix + template (Req 11.1).
  [K.adviceGapPrefix]: {
    th: "แจ้งเตือนช่องว่างทักษะ",
    default: "Skill gap alert",
  },
  // Placeholders: {dimension}, {benchmark}, {shortfall}. Composed example:
  // "แจ้งเตือนช่องว่างทักษะ: ทักษะ Data Cleaning ของคุณต่ำกว่าค่าเฉลี่ยตลาด 15%".
  [K.adviceGapTemplate]: {
    th: "ทักษะ {dimension} ของคุณต่ำกว่า{benchmark} {shortfall}%",
    default: "Your {dimension} skill is {shortfall}% below {benchmark}",
  },

  // Screen 3 — Radar dashboard header + cards
  [K.radarAppliedRoleTemplate]: {
    th: "ตำแหน่งที่สมัคร: {role}",
    default: "Applied role: {role}",
  },
  [K.radarOverallMatchLabel]: {
    th: "คะแนนความเหมาะสมโดยรวม",
    default: "Overall match score",
  },
  [K.radarSkillDnaTitle]: { th: "Skill DNA", default: "Skill DNA" },
  [K.radarTechnicalSkillsTitle]: {
    th: "ทักษะทางเทคนิคที่ผ่านการตรวจสอบ",
    default: "Verified Technical Skills",
  },
  [K.radarUpskillPriorityTitle]: {
    th: "ทักษะที่แนะนำให้พัฒนา (Upskill Priority)",
    default: "Recommended Skills to Improve (Upskill Priority)",
  },
  [K.radarUpskillFindChallenge]: {
    th: "ค้นหา challenge อัปสกิล",
    default: "Explore Upskill Challenge",
  },
  [K.radarRawDataTitle]: {
    th: "ข้อมูลดิบจากการทำงาน",
    default: "Raw Performance Data",
  },
  [K.radarSkillPassed]: { th: "ผ่าน", default: "Passed" },
  [K.radarSkillFailed]: { th: "ไม่ผ่าน", default: "Failed" },

  // Screen 4 — HR Dashboard
  [K.hrTitleTemplate]: {
    // Template with {count} and {role} placeholders composed at render time
    // (Req 12.1), e.g. "5 อันดับผู้สมัครสูงสุดสำหรับตำแหน่ง Data Analyst".
    th: "{count} อันดับผู้สมัครสูงสุดสำหรับตำแหน่ง {role}",
    default: "Top {count} candidates for {role}",
  },
  [K.hrEmpty]: {
    th: "ยังไม่มีผู้สมัครในรายการคัดเลือก",
    default: "No shortlisted candidates are available",
  },
  [K.hrScheduleInterview]: { th: "นัดหมายสัมภาษณ์", default: "Schedule interview" },
  [K.hrRejectAndReport]: {
    th: "ปฏิเสธและส่งรายงานช่องว่างทักษะ",
    default: "Reject and send skill-gap report",
  },
  [K.hrScoreUnavailable]: { th: "ไม่มีข้อมูล", default: "N/A" },
  [K.hrSkillMatch]: { th: "ความตรงของทักษะ", default: "Skill Match" },
  [K.hrCommutingFeasibility]: { th: "ความเป็นไปได้ในการเดินทาง", default: "Commuting Feasibility" },
  [K.hrUrbanFitLabel]: { th: "คะแนน Urban-Fit", default: "Urban-Fit Score" },
  [K.hrAiSummaryLabel]: { th: "สรุปโดย AI", default: "AI Summary" },
};
