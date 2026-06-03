"use client";

import { Scissors } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timecode } from "@/components/timecode";
import type { EvidenceClip } from "@/lib/types";

interface EvidenceClipListProps {
  clips: EvidenceClip[];
  onJumpToClip?: (clip: EvidenceClip) => void;
}

export function EvidenceClipList({ clips, onJumpToClip }: EvidenceClipListProps) {
  return (
    <section className="rounded-lg border bg-white">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="text-sm font-semibold">Evidence Clips</h2>
          <p className="mt-1 text-xs text-muted-foreground">Saved timestamp ranges for export packets.</p>
        </div>
        <Badge variant="neutral">{clips.length} clips</Badge>
      </div>
      <div className="space-y-3 p-4">
        {clips.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title="No evidence clips yet"
            description="Select a finding or timestamp range, then create a clip for the claim file."
          />
        ) : (
          clips.map((clip) => (
            <article key={clip.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{clip.title}</h3>
                <Timecode start={clip.startTimeSeconds} end={clip.endTimeSeconds} />
              </div>
              {onJumpToClip && (
                <Button size="sm" variant="outline" onClick={() => onJumpToClip(clip)}>
                  <Scissors className="h-3.5 w-3.5" />
                  Review
                </Button>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{clip.transcriptExcerpt}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
