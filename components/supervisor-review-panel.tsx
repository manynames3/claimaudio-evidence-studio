"use client";

import { CheckCircle2, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getClientSession, type ClientSessionUser } from "@/lib/client/auth-api";
import type { ClaimProject, EvidenceFinding } from "@/lib/types";

interface SupervisorReviewPanelProps {
  project: ClaimProject;
  findings: EvidenceFinding[];
  compact?: boolean;
  onAction: (action: "submit" | "approve" | "return") => void;
}

export function SupervisorReviewPanel({
  project,
  findings,
  compact,
  onAction
}: SupervisorReviewPanelProps) {
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const reviewedCount = findings.filter(
    (finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited"
  ).length;
  const pendingCount = findings.filter((finding) => finding.reviewStatus === "pending").length;
  const isSubmitted = project.status === "needsSupervisorReview" || project.reviewFlags.needsSupervisorReview;
  const isApproved = Boolean(project.reviewFlags.supervisorApproved);
  const isReturned = Boolean(project.reviewFlags.supervisorReturned);
  const canSupervisorReview =
    user?.role === "supervisor" || user?.role === "defense_attorney" || user?.role === "admin";

  useEffect(() => {
    let cancelled = false;

    void getClientSession()
      .then((session) => {
        if (!cancelled) {
          setUser(session.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={compact ? "rounded-lg border bg-white p-4" : "rounded-lg border bg-white p-5"}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-800" />
            <h2 className="text-sm font-semibold text-slate-950">Supervisor review</h2>
            <Badge variant={isApproved ? "success" : isReturned ? "warning" : isSubmitted ? "info" : "neutral"}>
              {isApproved ? "Approved" : isReturned ? "Returned" : isSubmitted ? "Pending" : "Not submitted"}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {reviewedCount} reviewed evidence items | {pendingCount} pending findings
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={reviewedCount === 0 || isSubmitted}
            onClick={() => onAction("submit")}
          >
            <Send className="h-3.5 w-3.5" />
            Submit
          </Button>
          <Button
            variant="success"
            size="sm"
            disabled={!isSubmitted || !canSupervisorReview}
            onClick={() => onAction("approve")}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!isSubmitted || !canSupervisorReview}
            onClick={() => onAction("return")}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Return
          </Button>
        </div>
      </div>
      {reviewedCount === 0 && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Approve or edit at least one quote-backed finding before supervisor submission or claim-file export.
        </p>
      )}
      {isSubmitted && !canSupervisorReview && (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          Supervisor, defense attorney, or admin role required to approve or return this review packet.
        </p>
      )}
    </section>
  );
}
