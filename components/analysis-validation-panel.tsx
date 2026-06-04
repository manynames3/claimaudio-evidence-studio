"use client";

import { CheckCircle2, Clock, Link2, Quote, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AudioAsset, Contradiction, EvidenceFinding, TranscriptSegment } from "@/lib/types";

interface AnalysisValidationPanelProps {
  audioAsset: AudioAsset;
  transcriptSegments: TranscriptSegment[];
  findings: EvidenceFinding[];
  contradictions: Contradiction[];
}

export function AnalysisValidationPanel({
  audioAsset,
  transcriptSegments,
  findings,
  contradictions
}: AnalysisValidationPanelProps) {
  const quoteBackedFindings = findings.filter(
    (finding) =>
      finding.exactQuote.trim() &&
      Number.isFinite(finding.startTimeSeconds) &&
      Number.isFinite(finding.endTimeSeconds) &&
      finding.relatedTranscriptSegmentIds.length > 0
  );
  const reviewedFindings = findings.filter(
    (finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited"
  );
  const reviewedContradictions = contradictions.filter(
    (contradiction) => contradiction.reviewStatus === "approved" || contradiction.reviewStatus === "edited"
  );
  const averageTranscriptConfidence = average(transcriptSegments.map((segment) => segment.confidence));
  const averageFindingConfidence = average(findings.map((finding) => finding.confidence));
  const validationComplete = findings.length > 0 && quoteBackedFindings.length === findings.length;

  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-800" />
            <h2 className="text-sm font-semibold text-slate-950">Evidence validation</h2>
            <Badge variant={validationComplete ? "success" : "warning"}>
              {validationComplete ? "Quote-backed" : "Needs review"}
            </Badge>
            <Badge variant="neutral">{audioAsset.sourceType === "uploaded" ? "Uploaded file" : "Sample file"}</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Findings are only useful if users can verify the source. This panel shows whether each AI item has exact quote, timestamp, transcript link, and confidence support before export.
          </p>
        </div>
        <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
          Human approval remains required. ClaimAudio does not make fraud, liability, coverage, or denial conclusions.
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ValidationMetric
          icon={Quote}
          label="Quote + timestamp support"
          value={`${quoteBackedFindings.length}/${findings.length}`}
          helper="Every exportable finding must cite the transcript."
          ready={validationComplete}
        />
        <ValidationMetric
          icon={Clock}
          label="Transcript confidence"
          value={formatPercent(averageTranscriptConfidence)}
          helper={`${transcriptSegments.length} timestamped segments`}
          ready={averageTranscriptConfidence >= 0.85}
        />
        <ValidationMetric
          icon={Link2}
          label="Finding confidence"
          value={formatPercent(averageFindingConfidence)}
          helper={`${reviewedFindings.length} reviewed, ${findings.length - reviewedFindings.length} unreviewed`}
          ready={averageFindingConfidence >= 0.85}
        />
        <ValidationMetric
          icon={CheckCircle2}
          label="Contradiction review"
          value={`${reviewedContradictions.length}/${contradictions.length}`}
          helper="Potential inconsistencies require separate approval."
          ready={contradictions.length === 0 || reviewedContradictions.length > 0}
        />
      </div>
    </section>
  );
}

function ValidationMetric({
  icon: Icon,
  label,
  value,
  helper,
  ready
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  helper: string;
  ready: boolean;
}) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-4 w-4 text-cyan-800" />
        <Badge variant={ready ? "success" : "warning"}>{ready ? "OK" : "Review"}</Badge>
      </div>
      <p className="mt-3 text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (validValues.length === 0) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
