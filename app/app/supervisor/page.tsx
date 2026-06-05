"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, Inbox, RotateCcw, UserRoundCheck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getClientSession, type ClientSessionUser } from "@/lib/client/auth-api";
import { useClaimAudioStore } from "@/lib/store/use-claim-audio-store";
import type { ClaimProject } from "@/lib/types";

const supervisorRoles = new Set(["supervisor", "defense_attorney", "admin"]);

export default function SupervisorQueuePage() {
  const {
    projects,
    audioAssets,
    findings,
    contradictions,
    clips,
    exportMemos,
    auditEvents,
    loadDashboardData,
    updateSupervisorReview
  } = useClaimAudioStore();
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const [notesByProjectId, setNotesByProjectId] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

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

  const packets = useMemo(
    () =>
      projects
        .filter(
          (project) =>
            project.reviewFlags.needsSupervisorReview ||
            project.reviewFlags.supervisorReturned ||
            project.reviewFlags.supervisorApproved ||
            project.status === "needsSupervisorReview"
        )
        .sort((left, right) => {
          const leftWeight = left.reviewFlags.needsSupervisorReview ? 0 : left.reviewFlags.supervisorReturned ? 1 : 2;
          const rightWeight = right.reviewFlags.needsSupervisorReview ? 0 : right.reviewFlags.supervisorReturned ? 1 : 2;

          if (leftWeight !== rightWeight) {
            return leftWeight - rightWeight;
          }

          return right.updatedAt.localeCompare(left.updatedAt);
        }),
    [projects]
  );
  const canDecide = Boolean(user?.role && supervisorRoles.has(user.role));
  const submittedCount = packets.filter((project) => project.reviewFlags.needsSupervisorReview).length;
  const returnedCount = packets.filter((project) => project.reviewFlags.supervisorReturned).length;
  const approvedCount = packets.filter((project) => project.reviewFlags.supervisorApproved).length;

  const handleDecision = async (projectId: string, action: "approve" | "return") => {
    await updateSupervisorReview(projectId, action, notesByProjectId[projectId]);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-white p-4 shadow-panel">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Supervisor queue</Badge>
              <Badge variant={canDecide ? "success" : "warning"}>
                {canDecide ? "Decision role active" : "View only"}
              </Badge>
            </div>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              Claim packets awaiting review
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review submitted evidence packets, validate quote-backed findings, approve for claim-file export, or return with a documented note.
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 gap-2 text-center">
            <QueueMetric label="Submitted" value={submittedCount} />
            <QueueMetric label="Returned" value={returnedCount} />
            <QueueMetric label="Approved" value={approvedCount} />
          </div>
        </div>
        <div className="mt-4 rounded-md border bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          Signed-in role: <strong>{user?.role?.replace("_", " ") || "loading"}</strong>. Supervisor, defense attorney, or admin role is required to approve or return a packet.
        </div>
      </section>

      {packets.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No supervisor packets yet"
          description="Submit a reviewed project for supervisor review and it will appear here with packet status, evidence counts, and decision controls."
        />
      ) : (
        <div className="grid gap-4">
          {packets.map((project) => {
            const audioAsset = audioAssets.find((asset) => asset.id === project.audioAssetId);
            const projectFindings = findings.filter((finding) => finding.audioAssetId === project.audioAssetId);
            const reviewedFindings = projectFindings.filter(
              (finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited"
            );
            const pendingFindings = projectFindings.filter((finding) => finding.reviewStatus === "pending");
            const projectContradictions = contradictions.filter(
              (contradiction) => contradiction.audioAssetId === project.audioAssetId
            );
            const reviewedContradictions = projectContradictions.filter(
              (contradiction) => contradiction.reviewStatus === "approved" || contradiction.reviewStatus === "edited"
            );
            const projectClips = clips.filter((clip) => clip.claimProjectId === project.id);
            const projectExports = exportMemos.filter((memo) => memo.claimProjectId === project.id);
            const submissionAudit = auditEvents.find(
              (event) =>
                event.claimProjectId === project.id &&
                event.eventType === "projectSubmittedForSupervisorReview"
            );

            return (
              <SupervisorPacketCard
                key={project.id}
                project={project}
                audioFileName={audioAsset?.fileName || "Recorded statement"}
                reviewedFindings={reviewedFindings.length}
                pendingFindings={pendingFindings.length}
                reviewedContradictions={reviewedContradictions.length}
                contradictions={projectContradictions.length}
                clips={projectClips.length}
                exports={projectExports.length}
                submittedBy={submissionAudit?.actor || "Reviewer"}
                note={notesByProjectId[project.id] || ""}
                canDecide={canDecide}
                onNoteChange={(note) =>
                  setNotesByProjectId((current) => ({
                    ...current,
                    [project.id]: note
                  }))
                }
                onApprove={() => void handleDecision(project.id, "approve")}
                onReturn={() => void handleDecision(project.id, "return")}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupervisorPacketCard({
  project,
  audioFileName,
  reviewedFindings,
  pendingFindings,
  reviewedContradictions,
  contradictions,
  clips,
  exports,
  submittedBy,
  note,
  canDecide,
  onNoteChange,
  onApprove,
  onReturn
}: {
  project: ClaimProject;
  audioFileName: string;
  reviewedFindings: number;
  pendingFindings: number;
  reviewedContradictions: number;
  contradictions: number;
  clips: number;
  exports: number;
  submittedBy: string;
  note: string;
  canDecide: boolean;
  onNoteChange: (note: string) => void;
  onApprove: () => void;
  onReturn: () => void;
}) {
  const isSubmitted = project.reviewFlags.needsSupervisorReview || project.status === "needsSupervisorReview";
  const isApproved = Boolean(project.reviewFlags.supervisorApproved);
  const isReturned = Boolean(project.reviewFlags.supervisorReturned);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-white">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isApproved ? "success" : isReturned ? "warning" : "info"}>
                {isApproved ? "Approved" : isReturned ? "Returned" : "Submitted"}
              </Badge>
              <StatusBadge status={project.status} />
              <Badge variant="neutral">{project.claimType}</Badge>
            </div>
            <CardTitle className="mt-3 text-lg">{project.claimNumber}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.claimantName} vs. insured {project.insuredName} | {audioFileName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/app/projects/${project.id}/workspace`} className={buttonVariants({ variant: "outline" })}>
              Validate evidence
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={`/app/projects/${project.id}/exports`} className={buttonVariants({ variant: "outline" })}>
              <FileText className="h-4 w-4" />
              Exports
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <PacketMetric label="Reviewed findings" value={`${reviewedFindings}`} ready={reviewedFindings > 0} />
          <PacketMetric label="Pending findings" value={`${pendingFindings}`} ready={pendingFindings === 0} />
          <PacketMetric label="Contradictions" value={`${reviewedContradictions}/${contradictions}`} ready={contradictions === 0 || reviewedContradictions > 0} />
          <PacketMetric label="Evidence clips" value={`${clips}`} ready={clips > 0} />
          <PacketMetric label="Exports generated" value={`${exports}`} ready={exports > 0} />
          <PacketMetric label="Submitted by" value={submittedBy} ready />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="rounded-md border bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <UserRoundCheck className="h-4 w-4 text-cyan-800" />
              <h3 className="text-sm font-semibold text-slate-950">Decision checklist</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              <li>Approve only after spot-checking the AI accuracy validation view for quote, segment, and timestamp support.</li>
              <li>Return if high-priority findings remain pending, contradictions are unsupported, or the export packet needs reviewer edits.</li>
              <li>Decision actions are stored in the audit trail with reviewer role and note.</li>
            </ul>
          </div>
          <div className="space-y-3">
            <Textarea
              className="min-h-24"
              placeholder="Approval note or return instructions for the audit trail."
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="success" disabled={!isSubmitted || !canDecide} onClick={onApprove}>
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button variant="outline" disabled={!isSubmitted || !canDecide} onClick={onReturn}>
                <RotateCcw className="h-4 w-4" />
                Return
              </Button>
            </div>
            {!canDecide && (
              <p className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                Your role can view this packet, but cannot approve or return it.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function PacketMetric({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
        <Badge variant={ready ? "success" : "warning"}>{ready ? "OK" : "Open"}</Badge>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
