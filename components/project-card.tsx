"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, FileAudio, Flag, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { AudioAsset, ClaimProject, EvidenceFinding } from "@/lib/types";

interface ProjectCardProps {
  project: ClaimProject;
  audioAsset?: AudioAsset;
  findings: EvidenceFinding[];
}

export function ProjectCard({ project, audioAsset, findings }: ProjectCardProps) {
  const pendingFindings = findings.filter((finding) => finding.reviewStatus === "pending").length;
  const approvedFindings = findings.filter((finding) => finding.reviewStatus === "approved").length;

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader className="border-b pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{project.claimNumber}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{project.claimType}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-slate-500" />
            {project.claimantName}
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            {project.lossDate}
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <FileAudio className="h-4 w-4 text-slate-500" />
            <span className="truncate">{audioAsset?.fileName || "No audio asset"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.reviewFlags.readyForReview && <Badge variant="success">Ready for review</Badge>}
          {project.reviewFlags.needsSupervisorReview && (
            <Badge variant="warning">Needs supervisor review</Badge>
          )}
          {project.reviewFlags.siuFlagged && (
            <Badge variant="danger">
              <Flag className="mr-1 h-3 w-3" />
              SIU flagged
            </Badge>
          )}
          {project.reviewFlags.draftMemoReady && <Badge variant="info">Draft memo ready</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending</p>
            <p className="mt-1 text-lg font-semibold">{pendingFindings}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Approved</p>
            <p className="mt-1 text-lg font-semibold">{approvedFindings}</p>
          </div>
        </div>
        <Link
          href={`/app/projects/${project.id}`}
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          Open project
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
