"use client";

import { CheckCircle2, LocateFixed, Quote, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timecode } from "@/components/timecode";
import type { EvidenceFinding, ReviewStatus, TranscriptSegment } from "@/lib/types";

interface AiAccuracyValidationViewProps {
  projectId: string;
  findings: EvidenceFinding[];
  transcriptSegments: TranscriptSegment[];
  selectedFindingId?: string;
  onSelectFinding: (finding: EvidenceFinding) => void;
  onJump: (seconds: number) => void;
  onStatusChange: (projectId: string, findingId: string, reviewStatus: ReviewStatus) => void;
}

export function AiAccuracyValidationView({
  projectId,
  findings,
  transcriptSegments,
  selectedFindingId,
  onSelectFinding,
  onJump,
  onStatusChange
}: AiAccuracyValidationViewProps) {
  const selectedFinding = findings.find((finding) => finding.id === selectedFindingId);
  const validationRows = uniqueFindings([
    ...(selectedFinding ? [selectedFinding] : []),
    ...findings.filter((finding) => finding.severity === "high"),
    ...findings.filter((finding) => finding.reviewStatus === "pending"),
    ...findings
  ]).slice(0, 5);
  const reviewedCount = findings.filter(
    (finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited"
  ).length;

  if (findings.length === 0) {
    return (
      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-800" />
          <h2 className="text-sm font-semibold text-slate-950">AI accuracy validation</h2>
          <Badge variant="neutral">Waiting for findings</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Findings from uploaded or sample statements will appear here for quote and timestamp validation.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-800" />
            <h2 className="text-sm font-semibold text-slate-950">AI accuracy validation</h2>
            <Badge variant={reviewedCount > 0 ? "success" : "warning"}>
              {reviewedCount}/{findings.length} reviewed
            </Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Spot-check each AI item against the transcript source before it can become claim-file evidence.
          </p>
        </div>
        <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
          Use this view during demos to prove ClaimAudio is not just transcription: every useful AI item must survive a quote, segment, timestamp, and reviewer decision check.
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {validationRows.map((finding) => {
          const transcriptSegment = findSupportingSegment(finding, transcriptSegments);
          const hasQuoteSupport = Boolean(
            finding.exactQuote.trim() &&
              transcriptSegment &&
              quoteMatchesSegment(finding.exactQuote, transcriptSegment.text)
          );
          const isSelected = finding.id === selectedFindingId;

          return (
            <article
              key={finding.id}
              className={isSelected ? "rounded-md border border-cyan-300 bg-cyan-50/40 p-3" : "rounded-md border bg-slate-50 p-3"}
            >
              <div className="grid gap-3 xl:grid-cols-[minmax(240px,1.1fr)_minmax(260px,1.4fr)_220px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={finding.category === "SIU Flag" ? "danger" : "info"}>{finding.category}</Badge>
                    <Badge variant={hasQuoteSupport ? "success" : "warning"}>
                      {hasQuoteSupport ? "Quote verified" : "Quote mismatch"}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-slate-950">{finding.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Timecode start={finding.startTimeSeconds} end={finding.endTimeSeconds} />
                    <span>{Math.round(finding.confidence * 100)}% AI confidence</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="rounded-md border bg-white p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                      <Quote className="h-3.5 w-3.5" />
                      Source quote
                    </div>
                    <p className="text-sm leading-6 text-slate-800">"{finding.exactQuote}"</p>
                  </div>
                  <div className="rounded-md border bg-white p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Transcript segment</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {transcriptSegment
                        ? `${transcriptSegment.speaker}: ${transcriptSegment.text}`
                        : "No linked segment found. Exclude from export until corrected."}
                    </p>
                    {transcriptSegment && !hasQuoteSupport && (
                      <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs leading-5 text-amber-900">
                        Linked timestamp found, but this segment does not contain the exact quote. Exclude or edit before export.
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Badge variant={finding.reviewStatus === "approved" || finding.reviewStatus === "edited" ? "success" : finding.reviewStatus === "rejected" ? "danger" : "warning"}>
                    Reviewer decision: {finding.reviewStatus}
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onSelectFinding(finding);
                      onJump(finding.startTimeSeconds);
                    }}
                  >
                    <LocateFixed className="h-4 w-4" />
                    Jump to timestamp
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="success"
                      onClick={() => onStatusChange(projectId, finding.id, "approved")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onStatusChange(projectId, finding.id, "rejected")}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function uniqueFindings(findings: EvidenceFinding[]) {
  const seenIds = new Set<string>();

  return findings.filter((finding) => {
    if (seenIds.has(finding.id)) {
      return false;
    }

    seenIds.add(finding.id);
    return true;
  });
}

function findSupportingSegment(finding: EvidenceFinding, transcriptSegments: TranscriptSegment[]) {
  const quoteSegment = transcriptSegments.find((segment) =>
    quoteMatchesSegment(finding.exactQuote, segment.text)
  );

  if (quoteSegment) {
    return quoteSegment;
  }

  const linkedSegment = transcriptSegments.find((segment) =>
    finding.relatedTranscriptSegmentIds.includes(segment.id)
  );

  if (linkedSegment) {
    return linkedSegment;
  }

  const quoteSnippet = finding.exactQuote.slice(0, 42).toLowerCase();

  return transcriptSegments.find((segment) => {
    const overlapsTime =
      segment.startTimeSeconds <= finding.endTimeSeconds &&
      segment.endTimeSeconds >= finding.startTimeSeconds;
    const containsQuote = quoteSnippet.length > 8 && segment.text.toLowerCase().includes(quoteSnippet);

    return overlapsTime || containsQuote;
  });
}

function quoteMatchesSegment(quote: string, segmentText: string) {
  const normalizedQuote = normalizeEvidenceText(quote);
  const normalizedSegment = normalizeEvidenceText(segmentText);

  if (!normalizedQuote || !normalizedSegment) {
    return false;
  }

  if (normalizedSegment.includes(normalizedQuote)) {
    return true;
  }

  const quoteWords = normalizedQuote.split(" ").filter(Boolean);

  if (quoteWords.length < 5) {
    return false;
  }

  const meaningfulWindow = quoteWords.slice(0, Math.min(8, quoteWords.length)).join(" ");

  return normalizedSegment.includes(meaningfulWindow);
}

function normalizeEvidenceText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
