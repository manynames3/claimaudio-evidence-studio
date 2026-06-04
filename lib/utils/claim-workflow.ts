import type { ClaimProject, EvidenceFinding } from "@/lib/types";

export interface ProjectEvidenceSummary {
  pending: number;
  approved: number;
  edited: number;
  rejected: number;
  reviewed: number;
  pendingHighSeverity: number;
  total: number;
}

export interface ProjectNextAction {
  label: string;
  helper: string;
  href: string;
  tone: "neutral" | "info" | "warning" | "success" | "danger";
}

export function getProjectEvidenceSummary(findings: EvidenceFinding[]): ProjectEvidenceSummary {
  const pending = findings.filter((finding) => finding.reviewStatus === "pending").length;
  const approved = findings.filter((finding) => finding.reviewStatus === "approved").length;
  const edited = findings.filter((finding) => finding.reviewStatus === "edited").length;
  const rejected = findings.filter((finding) => finding.reviewStatus === "rejected").length;

  return {
    pending,
    approved,
    edited,
    rejected,
    reviewed: approved + edited,
    pendingHighSeverity: findings.filter(
      (finding) => finding.reviewStatus === "pending" && finding.severity === "high"
    ).length,
    total: findings.length
  };
}

export function getProjectNextAction(project: ClaimProject, findings: EvidenceFinding[]): ProjectNextAction {
  const summary = getProjectEvidenceSummary(findings);

  if (project.status === "failed") {
    return {
      label: "Review failure",
      helper: "Processing needs attention before evidence review.",
      href: `/app/projects/${project.id}`,
      tone: "danger"
    };
  }

  if (project.status === "uploaded" || project.status === "transcribing" || project.status === "analyzing") {
    return {
      label: "Check processing",
      helper: "Transcript and analysis are not ready yet.",
      href: `/app/projects/${project.id}`,
      tone: "info"
    };
  }

  if (summary.pending > 0) {
    return {
      label: `Review ${summary.pending} finding${summary.pending === 1 ? "" : "s"}`,
      helper: summary.pendingHighSeverity
        ? `${summary.pendingHighSeverity} high-severity item${summary.pendingHighSeverity === 1 ? "" : "s"} open.`
        : "Approve, reject, or edit quote-backed findings.",
      href: `/app/projects/${project.id}/workspace`,
      tone: summary.pendingHighSeverity ? "warning" : "info"
    };
  }

  if (project.reviewFlags.needsSupervisorReview) {
    return {
      label: "Supervisor packet",
      helper: project.reviewFlags.supervisorApproved
        ? "Packet approved; export claim-file work product."
        : "Packet submitted and awaiting supervisor decision.",
      href: `/app/projects/${project.id}/workspace`,
      tone: project.reviewFlags.supervisorApproved ? "success" : "warning"
    };
  }

  if (project.reviewFlags.draftMemoReady || summary.reviewed > 0) {
    return {
      label: "Export memo",
      helper: `${summary.reviewed} reviewed evidence item${summary.reviewed === 1 ? "" : "s"} available.`,
      href: `/app/projects/${project.id}/exports`,
      tone: "success"
    };
  }

  return {
    label: "Open workspace",
    helper: "Review transcript, findings, clips, and memo preview.",
    href: `/app/projects/${project.id}/workspace`,
    tone: "neutral"
  };
}
