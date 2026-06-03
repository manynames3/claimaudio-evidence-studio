"use client";

import { useMemo, useState } from "react";
import { Filter, ListFilter } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { EvidenceFindingCard } from "@/components/evidence-finding-card";
import { Badge } from "@/components/ui/badge";
import { evidenceCategories } from "@/lib/mock-data";
import type { EvidenceFinding, ReviewStatus } from "@/lib/types";

interface FindingsPanelProps {
  projectId: string;
  findings: EvidenceFinding[];
  selectedFindingId?: string;
  onSelectFinding: (finding: EvidenceFinding) => void;
  onStatusChange: (projectId: string, findingId: string, reviewStatus: ReviewStatus) => void;
  onEditFinding: (
    projectId: string,
    findingId: string,
    updates: Pick<EvidenceFinding, "title" | "whyItMatters" | "recommendedFollowUp" | "notes">
  ) => void;
}

export function FindingsPanel({
  projectId,
  findings,
  selectedFindingId,
  onSelectFinding,
  onStatusChange,
  onEditFinding
}: FindingsPanelProps) {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [confidence, setConfidence] = useState("all");

  const validatedFindings = useMemo(
    () =>
      findings.filter(
        (finding) =>
          finding.exactQuote &&
          Number.isFinite(finding.startTimeSeconds) &&
          Number.isFinite(finding.endTimeSeconds) &&
          finding.relatedTranscriptSegmentIds.length > 0
      ),
    [findings]
  );

  const filteredFindings = validatedFindings.filter((finding) => {
    const matchesCategory = category === "all" || finding.category === category;
    const matchesStatus = status === "all" || finding.reviewStatus === status;
    const matchesConfidence =
      confidence === "all" ||
      (confidence === "high" && finding.confidence >= 0.92) ||
      (confidence === "medium" && finding.confidence >= 0.88 && finding.confidence < 0.92);

    return matchesCategory && matchesStatus && matchesConfidence;
  });

  return (
    <section className="flex h-full min-h-[650px] flex-col rounded-lg border bg-white">
      <div className="border-b p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">AI Evidence Findings</h2>
          </div>
          <Badge variant="info">{filteredFindings.length} shown</Badge>
        </div>
        <div className="mt-3 grid gap-2 2xl:grid-cols-3">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {evidenceCategories.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={confidence}
            onChange={(event) => setConfidence(event.target.value)}
          >
            <option value="all">All confidence</option>
            <option value="high">92% and above</option>
            <option value="medium">88%-91%</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="edited">Edited</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      <div className="claims-scrollbar flex-1 overflow-auto p-3">
        <div className="mb-3 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
          <Filter className="h-3.5 w-3.5" />
          Quote-supported only
        </div>
        {filteredFindings.length === 0 ? (
          <EmptyState
            icon={ListFilter}
            title="No findings in this view"
            description="Adjust the category, confidence, or status filters to show quote-supported evidence findings."
          />
        ) : (
          <div className="space-y-3">
            {filteredFindings.map((finding) => (
              <EvidenceFindingCard
                key={finding.id}
                projectId={projectId}
                finding={finding}
                selected={selectedFindingId === finding.id}
                onJump={onSelectFinding}
                onStatusChange={onStatusChange}
                onEdit={onEditFinding}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
