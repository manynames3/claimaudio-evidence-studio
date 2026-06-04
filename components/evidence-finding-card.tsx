"use client";

import { useState } from "react";
import { Headphones, Link2, PencilLine, Quote, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ReviewActionButtons } from "@/components/review-action-buttons";
import { StatusBadge } from "@/components/status-badge";
import { Timecode } from "@/components/timecode";
import type { EvidenceFinding, ReviewStatus } from "@/lib/types";

interface EvidenceFindingCardProps {
  projectId: string;
  finding: EvidenceFinding;
  selected: boolean;
  onJump: (finding: EvidenceFinding) => void;
  onStatusChange: (projectId: string, findingId: string, reviewStatus: ReviewStatus) => void;
  onEdit: (
    projectId: string,
    findingId: string,
    updates: Pick<EvidenceFinding, "title" | "whyItMatters" | "recommendedFollowUp" | "notes">
  ) => void;
}

function severityVariant(severity: EvidenceFinding["severity"]) {
  if (severity === "high") {
    return "danger";
  }
  if (severity === "medium") {
    return "warning";
  }
  return "neutral";
}

export function EvidenceFindingCard({
  projectId,
  finding,
  selected,
  onJump,
  onStatusChange,
  onEdit
}: EvidenceFindingCardProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(finding.title);
  const [whyItMatters, setWhyItMatters] = useState(finding.whyItMatters);
  const [recommendedFollowUp, setRecommendedFollowUp] = useState(finding.recommendedFollowUp);
  const [notes, setNotes] = useState(finding.notes);

  const submitEdit = () => {
    onEdit(projectId, finding.id, {
      title,
      whyItMatters,
      recommendedFollowUp,
      notes
    });
    setOpen(false);
  };
  const jumpToFinding = () => onJump(finding);

  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-sm transition-colors ${
        selected ? "border-cyan-800 ring-2 ring-cyan-100" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{finding.category}</Badge>
            <Badge variant={severityVariant(finding.severity)}>{finding.severity} severity</Badge>
            <StatusBadge status={finding.reviewStatus} />
          </div>
          <h3 className="text-base font-semibold leading-6 text-slate-950">{finding.title}</h3>
        </div>
        <div className="rounded-md bg-slate-50 px-2 py-1 text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Confidence</p>
          <p className="text-sm font-semibold">{Math.round(finding.confidence * 100)}%</p>
        </div>
      </div>
      <div className="mt-3 rounded-md border border-cyan-100 bg-cyan-50/70 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-950">
          <Quote className="h-3.5 w-3.5" />
          Timestamped proof
        </div>
        <blockquote className="border-l-4 border-cyan-800 pl-3 text-sm leading-6 text-slate-800">
          "{finding.exactQuote}"
        </blockquote>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>{finding.speaker}</span>
          <span aria-hidden="true">|</span>
          <Timecode start={finding.startTimeSeconds} end={finding.endTimeSeconds} />
          <span aria-hidden="true">|</span>
          <span className="inline-flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            {finding.relatedTranscriptSegmentIds.length} linked segment
            {finding.relatedTranscriptSegmentIds.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-700">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="font-semibold text-slate-900">Claim impact</p>
          <p className="mt-1">{finding.whyItMatters}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="font-semibold text-slate-900">Recommended next action</p>
          <p className="mt-1">{finding.recommendedFollowUp}</p>
        </div>
      </div>
      {finding.notes && (
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          Reviewer note: {finding.notes}
        </p>
      )}
      <div className="mt-4 space-y-2">
        <Button
          className="w-full"
          variant="outline"
          size="sm"
          type="button"
          onPointerDown={(event) => {
            if (event.button === 0) {
              jumpToFinding();
            }
          }}
          onClick={jumpToFinding}
        >
          <Headphones className="h-3.5 w-3.5" />
          Jump to audio
        </Button>
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <ShieldCheck className="h-3.5 w-3.5" />
          Human approval required before export.
        </div>
        <ReviewActionButtons
          onApprove={() => onStatusChange(projectId, finding.id, "approved")}
          onReject={() => onStatusChange(projectId, finding.id, "rejected")}
          onEdit={() => setOpen(true)}
        />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit finding</DialogTitle>
            <DialogDescription>
              Keep the exact quote and timestamp fixed while editing the reviewer-facing interpretation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`title-${finding.id}`}>Title</Label>
              <Input id={`title-${finding.id}`} value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`why-${finding.id}`}>Why it matters</Label>
              <Textarea
                id={`why-${finding.id}`}
                value={whyItMatters}
                onChange={(event) => setWhyItMatters(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`follow-up-${finding.id}`}>Recommended follow-up</Label>
              <Textarea
                id={`follow-up-${finding.id}`}
                value={recommendedFollowUp}
                onChange={(event) => setRecommendedFollowUp(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`notes-${finding.id}`}>Reviewer notes</Label>
              <Textarea id={`notes-${finding.id}`} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit}>
              <PencilLine className="h-4 w-4" />
              Save finding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
