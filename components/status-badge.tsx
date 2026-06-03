import { Badge } from "@/components/ui/badge";
import type { ClaimProjectStatus, ProcessingStatus, ReviewStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ProcessingStatus | ReviewStatus | ClaimProjectStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const labelMap: Record<string, string> = {
    uploaded: "Uploaded",
    transcribing: "Transcribing",
    analyzing: "Analyzing",
    readyForReview: "Ready for review",
    failed: "Failed",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    edited: "Edited",
    ready: "Ready",
    reviewing: "Reviewing",
    needsSupervisorReview: "Supervisor review",
    draft: "Draft"
  };

  const variantMap: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
    uploaded: "neutral",
    transcribing: "info",
    analyzing: "warning",
    readyForReview: "success",
    failed: "danger",
    pending: "warning",
    approved: "success",
    rejected: "danger",
    edited: "info",
    ready: "success",
    reviewing: "info",
    needsSupervisorReview: "warning",
    draft: "neutral"
  };

  return <Badge variant={variantMap[status] || "neutral"}>{labelMap[status] || status}</Badge>;
}
