"use client";

import { CheckCircle2, FileArchive, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { getClientSession, type ClientSessionUser } from "@/lib/client/auth-api";
import type { ClaimProject, Contradiction, EvidenceClip, EvidenceFinding, ExportMemo } from "@/lib/types";

interface SupervisorReviewPanelProps {
  project: ClaimProject;
  findings: EvidenceFinding[];
  contradictions?: Contradiction[];
  clips?: EvidenceClip[];
  exportMemos?: ExportMemo[];
  compact?: boolean;
  onAction: (action: "submit" | "approve" | "return", note?: string) => void;
}

export function SupervisorReviewPanel({
  project,
  findings,
  contradictions = [],
  clips = [],
  exportMemos = [],
  compact,
  onAction
}: SupervisorReviewPanelProps) {
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const [note, setNote] = useState("");
  const reviewedCount = findings.filter(
    (finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited"
  ).length;
  const pendingCount = findings.filter((finding) => finding.reviewStatus === "pending").length;
  const reviewedContradictionCount = contradictions.filter(
    (contradiction) => contradiction.reviewStatus === "approved" || contradiction.reviewStatus === "edited"
  ).length;
  const isSubmitted = project.status === "needsSupervisorReview" || project.reviewFlags.needsSupervisorReview;
  const isApproved = Boolean(project.reviewFlags.supervisorApproved);
  const isReturned = Boolean(project.reviewFlags.supervisorReturned);
  const canSupervisorReview =
    user?.role === "supervisor" || user?.role === "defense_attorney" || user?.role === "admin";
  const reviewerRole = user?.role ? user.role.replace("_", " ") : "pilot reviewer";
  const packetState = isApproved ? "Approved for export" : isReturned ? "Returned to reviewer" : isSubmitted ? "Submitted for decision" : "Reviewer drafting";
  const checklist = [
    {
      label: "Reviewed evidence items",
      value: `${reviewedCount} approved or edited`,
      ready: reviewedCount > 0
    },
    {
      label: "Pending findings",
      value: pendingCount === 0 ? "None remaining" : `${pendingCount} still pending`,
      ready: pendingCount === 0
    },
    {
      label: "Contradiction review",
      value: contradictions.length ? `${reviewedContradictionCount}/${contradictions.length} reviewed` : "No contradictions",
      ready: contradictions.length === 0 || reviewedContradictionCount > 0
    },
    {
      label: "Evidence clips",
      value: `${clips.length} saved`,
      ready: clips.length > 0
    },
    {
      label: "Export packet",
      value: exportMemos.length ? `${exportMemos.length} generated` : "Not generated",
      ready: exportMemos.length > 0
    }
  ];

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
            {reviewedCount} reviewed evidence items | {pendingCount} pending findings | {reviewedContradictionCount} reviewed contradictions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={reviewedCount === 0 || isSubmitted}
            onClick={() => onAction("submit", note)}
          >
            <Send className="h-3.5 w-3.5" />
            Submit packet
          </Button>
          <Button
            variant="success"
            size="sm"
            disabled={!isSubmitted || !canSupervisorReview}
            onClick={() => onAction("approve", note)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve packet
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!isSubmitted || !canSupervisorReview}
            onClick={() => onAction("return", note)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Return with note
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <PacketState label="Packet state" value={packetState} ready={isApproved || isSubmitted} />
        <PacketState label="Reviewer role" value={reviewerRole} ready={Boolean(user)} />
        <PacketState
          label="Decision authority"
          value={canSupervisorReview ? "Can approve/return" : "Submit only"}
          ready={canSupervisorReview}
        />
        <PacketState label="Audit trail" value="Action logged" ready />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {checklist.map((item) => (
          <div key={item.label} className="rounded-md border bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <FileArchive className="h-3.5 w-3.5 text-cyan-800" />
              <Badge variant={item.ready ? "success" : "warning"}>{item.ready ? "Ready" : "Open"}</Badge>
            </div>
            <p className="mt-2 text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-700">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <label htmlFor="supervisor-review-note" className="text-xs font-medium uppercase text-muted-foreground">
          Review note
        </label>
        <Textarea
          id="supervisor-review-note"
          className="min-h-20"
          placeholder="Add supervisor instructions, return reason, or approval note for the audit trail."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
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

function PacketState({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
        <Badge variant={ready ? "success" : "neutral"}>{ready ? "Active" : "Open"}</Badge>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
