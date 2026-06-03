"use client";

import { FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Timecode } from "@/components/timecode";
import type { ClaimProject, EvidenceFinding, ExportMemo } from "@/lib/types";

interface MemoPreviewProps {
  project: ClaimProject;
  findings: EvidenceFinding[];
  memo?: ExportMemo;
}

export function MemoPreview({ project, findings, memo }: MemoPreviewProps) {
  const approvedFindings = findings.filter((finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited");

  return (
    <section className="rounded-lg border bg-white">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-800" />
          <div>
            <h2 className="text-sm font-semibold">Claim Memo Preview</h2>
            <p className="mt-1 text-xs text-muted-foreground">{project.claimNumber}</p>
          </div>
        </div>
        <Badge variant="info">{approvedFindings.length} included</Badge>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-sm font-semibold">Executive summary</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {memo?.content.split("Supervisor note:")[1]?.trim() ||
              "Approved evidence will appear here as the reviewer builds the memo."}
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Approved timestamped evidence</h3>
          {approvedFindings.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No approved evidence yet"
              description="Approve findings in the evidence panel to assemble the memo preview."
            />
          ) : (
            approvedFindings.slice(0, 5).map((finding) => (
              <div key={finding.id} className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{finding.category}: {finding.title}</span>
                  <Timecode start={finding.startTimeSeconds} end={finding.endTimeSeconds} />
                </div>
                <p className="mt-2 leading-6 text-slate-700">"{finding.exactQuote}"</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
