"use client";

import Link from "next/link";
import { ArrowRight, FileAudio, Flag, ShieldCheck } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getProjectEvidenceSummary, getProjectNextAction } from "@/lib/utils/claim-workflow";
import { cn } from "@/lib/utils";
import type { AudioAsset, ClaimProject, EvidenceFinding } from "@/lib/types";

interface ClaimProjectQueueProps {
  projects: ClaimProject[];
  audioAssets: AudioAsset[];
  findings: EvidenceFinding[];
}

export function ClaimProjectQueue({ projects, audioAssets, findings }: ClaimProjectQueueProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-md border lg:block">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Claim</th>
              <th className="px-4 py-3">Parties</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Evidence</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3">Next action</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {projects.map((project) => {
              const audioAsset = audioAssets.find((asset) => asset.id === project.audioAssetId);
              const projectFindings = findings.filter((finding) => finding.audioAssetId === project.audioAssetId);
              const summary = getProjectEvidenceSummary(projectFindings);
              const action = getProjectNextAction(project, projectFindings);

              return (
                <tr key={project.id} className="align-top transition-colors hover:bg-slate-50/80">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{project.claimNumber}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{project.claimType}</div>
                    <div className="mt-2 flex max-w-[260px] items-center gap-1 text-xs text-muted-foreground">
                      <FileAudio className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{audioAsset?.fileName || "No recorded statement"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-slate-800">{project.claimantName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Insured: {project.insuredName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">DOL {project.lossDate}</div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={project.status} />
                    <div className="mt-2 text-xs text-muted-foreground">{audioAsset?.sourceType === "uploaded" ? "Uploaded statement" : "Sample statement"}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="grid w-[180px] grid-cols-3 overflow-hidden rounded-md border bg-slate-50 text-center">
                      <EvidenceCount label="Open" value={summary.pending} tone={summary.pending ? "warning" : "neutral"} />
                      <EvidenceCount label="Ready" value={summary.reviewed} tone={summary.reviewed ? "success" : "neutral"} />
                      <EvidenceCount label="Total" value={summary.total} tone="neutral" />
                    </div>
                    {summary.pendingHighSeverity > 0 && (
                      <p className="mt-2 text-xs font-medium text-amber-800">{summary.pendingHighSeverity} high-severity open</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex max-w-[220px] flex-wrap gap-1.5">
                      {project.reviewFlags.readyForReview && <Badge variant="success">Ready</Badge>}
                      {project.reviewFlags.needsSupervisorReview && <Badge variant="warning">Supervisor</Badge>}
                      {project.reviewFlags.siuFlagged && (
                        <Badge className="gap-1" variant="danger">
                          <Flag className="h-3 w-3" />
                          SIU
                        </Badge>
                      )}
                      {project.reviewFlags.draftMemoReady && <Badge variant="info">Memo</Badge>}
                      {project.reviewFlags.supervisorApproved && (
                        <Badge className="gap-1" variant="success">
                          <ShieldCheck className="h-3 w-3" />
                          Approved
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="max-w-[210px]">
                      <Link
                        href={action.href}
                        className={buttonVariants({
                          variant: action.tone === "success" ? "default" : "outline",
                          size: "sm",
                          className: "w-full justify-between"
                        })}
                      >
                        {action.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <p className={cn("mt-2 text-xs leading-5 text-muted-foreground", action.tone === "warning" && "text-amber-800")}>
                        {action.helper}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {projects.map((project) => {
          const audioAsset = audioAssets.find((asset) => asset.id === project.audioAssetId);
          const projectFindings = findings.filter((finding) => finding.audioAssetId === project.audioAssetId);

          return <ProjectCard key={project.id} project={project} audioAsset={audioAsset} findings={projectFindings} />;
        })}
      </div>
    </>
  );
}

function EvidenceCount({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "neutral" }) {
  return (
    <div
      className={cn(
        "border-r px-2 py-2 last:border-r-0",
        tone === "success" && "bg-emerald-50",
        tone === "warning" && "bg-amber-50"
      )}
    >
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}
