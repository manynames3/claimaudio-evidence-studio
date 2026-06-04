"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, FileAudio, Flag, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { getProjectEvidenceSummary, getProjectNextAction } from "@/lib/utils/claim-workflow";
import { cn } from "@/lib/utils";
import type { AudioAsset, ClaimProject, EvidenceFinding } from "@/lib/types";

interface ProjectCardProps {
  project: ClaimProject;
  audioAsset?: AudioAsset;
  findings: EvidenceFinding[];
}

export function ProjectCard({ project, audioAsset, findings }: ProjectCardProps) {
  const summary = getProjectEvidenceSummary(findings);
  const action = getProjectNextAction(project, findings);

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader className="border-b bg-slate-50/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">Claim number</p>
            <CardTitle className="mt-1 truncate text-base">{project.claimNumber}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{project.claimType}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-2 text-sm text-slate-700">
          <MetadataLine icon={UserRound} label="Claimant" value={project.claimantName} />
          <MetadataLine icon={ShieldCheck} label="Insured" value={project.insuredName} />
          <MetadataLine icon={CalendarDays} label="Loss date" value={project.lossDate} />
          <MetadataLine icon={FileAudio} label="Statement" value={audioAsset?.fileName || "No audio asset"} truncate />
        </div>
        <div className="flex flex-wrap gap-2">
          {project.reviewFlags.readyForReview && <Badge variant="success">Ready for review</Badge>}
          {project.reviewFlags.needsSupervisorReview && (
            <Badge variant="warning">Needs supervisor review</Badge>
          )}
          {project.reviewFlags.siuFlagged && (
            <Badge className="gap-1" variant="danger">
              <Flag className="h-3 w-3" />
              SIU flagged
            </Badge>
          )}
          {project.reviewFlags.draftMemoReady && <Badge variant="info">Draft memo ready</Badge>}
        </div>
        <div className="grid grid-cols-3 overflow-hidden rounded-md border bg-slate-50 text-sm">
          <EvidenceMetric label="Open" value={summary.pending} tone={summary.pending ? "warning" : "neutral"} />
          <EvidenceMetric label="Ready" value={summary.reviewed} tone={summary.reviewed ? "success" : "neutral"} />
          <EvidenceMetric label="Total" value={summary.total} tone="neutral" />
        </div>
        <Link
          href={action.href}
          className={buttonVariants({ variant: "outline", className: "w-full justify-between" })}
        >
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className={cn("text-xs leading-5 text-muted-foreground", action.tone === "warning" && "text-amber-800")}>
          {action.helper}
        </p>
      </CardContent>
    </Card>
  );
}

function MetadataLine({
  icon: Icon,
  label,
  value,
  truncate
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="grid grid-cols-[18px_74px_minmax(0,1fr)] items-center gap-2">
      <Icon className="h-4 w-4 text-slate-500" />
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className={cn("text-slate-800", truncate && "truncate")}>{value}</span>
    </div>
  );
}

function EvidenceMetric({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "neutral" }) {
  return (
    <div
      className={cn(
        "border-r px-3 py-2 last:border-r-0",
        tone === "success" && "bg-emerald-50",
        tone === "warning" && "bg-amber-50"
      )}
    >
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
