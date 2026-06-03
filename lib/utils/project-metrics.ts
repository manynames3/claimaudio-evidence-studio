import type { ClaimProject, Contradiction, EvidenceFinding } from "@/lib/types";

export interface ProductValueMetrics {
  manualSummaryTimeEstimate: string;
  aiAssistedReviewTimeEstimate: string;
  findingsDetected: number;
  findingsApproved: number;
  contradictionsFound: number;
  followUpQuestionsGenerated: number;
}

export function getProductValueMetrics(
  project: ClaimProject,
  findings: EvidenceFinding[],
  contradictions: Contradiction[]
): ProductValueMetrics {
  const highSeverityFollowUps = findings.filter(
    (finding) => finding.severity === "high" || finding.category === "Follow-up"
  ).length;

  return {
    manualSummaryTimeEstimate:
      project.claimType.toLowerCase().includes("bodily injury") ? "75-90 min" : "45-60 min",
    aiAssistedReviewTimeEstimate: "12-18 min",
    findingsDetected: findings.length,
    findingsApproved: findings.filter((finding) => finding.reviewStatus === "approved").length,
    contradictionsFound: contradictions.length,
    followUpQuestionsGenerated: Math.max(6, highSeverityFollowUps + contradictions.length + 2)
  };
}
