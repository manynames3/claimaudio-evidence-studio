"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Timecode } from "@/components/timecode";
import { cn } from "@/lib/utils";
import type { TranscriptSegment } from "@/lib/types";

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  selectedSegmentId?: string;
  currentTimeSeconds: number;
  onSelectSegment: (segment: TranscriptSegment) => void;
}

export function TranscriptPanel({
  segments,
  selectedSegmentId,
  currentTimeSeconds,
  onSelectSegment
}: TranscriptPanelProps) {
  const [search, setSearch] = useState("");
  const [speaker, setSpeaker] = useState("all");
  const segmentListRef = useRef<HTMLDivElement | null>(null);
  const speakers = useMemo(() => Array.from(new Set(segments.map((segment) => segment.speaker))), [segments]);
  const segmentLookup = useMemo(
    () => new Map(segments.map((segment) => [segment.id, segment])),
    [segments]
  );
  const selectSegmentFromTarget = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return;
      }

      const segmentButton = target.closest<HTMLButtonElement>("[data-transcript-segment-id]");
      const segmentId = segmentButton?.dataset.transcriptSegmentId;
      const segment = segmentId ? segmentLookup.get(segmentId) : undefined;

      if (segment) {
        onSelectSegment(segment);
      }
    },
    [onSelectSegment, segmentLookup]
  );

  const filteredSegments = segments.filter((segment) => {
    const matchesSearch = segment.text.toLowerCase().includes(search.toLowerCase());
    const matchesSpeaker = speaker === "all" || segment.speaker === speaker;

    return matchesSearch && matchesSpeaker;
  });

  useEffect(() => {
    const segmentList = segmentListRef.current;

    if (!segmentList) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      selectSegmentFromTarget(event.target);
    };

    segmentList.addEventListener("pointerdown", handlePointerDown);

    return () => segmentList.removeEventListener("pointerdown", handlePointerDown);
  }, [selectSegmentFromTarget]);

  return (
    <section className="flex h-full min-h-[650px] flex-col rounded-lg border bg-white">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Transcript</h2>
            <p className="mt-1 text-xs text-muted-foreground">Click a segment to seek audio.</p>
          </div>
          <Badge variant="neutral">{segments.length} segments</Badge>
        </div>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search transcript"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={speaker}
            onChange={(event) => setSpeaker(event.target.value)}
          >
            <option value="all">All speakers</option>
            {speakers.map((speakerName) => (
              <option value={speakerName} key={speakerName}>
                {speakerName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="claims-scrollbar flex-1 overflow-auto p-3">
        {filteredSegments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No transcript segments found"
            description="Clear the search or speaker filter to return to the full recorded statement."
          />
        ) : (
          <div ref={segmentListRef} className="space-y-2">
            {filteredSegments.map((segment) => {
            const active =
              selectedSegmentId === segment.id ||
              (currentTimeSeconds >= segment.startTimeSeconds &&
                currentTimeSeconds <= segment.endTimeSeconds);

            return (
              <button
                type="button"
                key={segment.id}
                data-transcript-segment-id={segment.id}
                onClick={() => onSelectSegment(segment)}
                className={cn(
                  "w-full rounded-md border p-3 text-left transition-colors hover:border-cyan-700 hover:bg-cyan-50/50",
                  active ? "border-cyan-700 bg-cyan-50" : "border-slate-200 bg-white"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={segment.speaker === "Adjuster" ? "neutral" : "info"}>
                    {segment.speaker}
                  </Badge>
                  <Timecode start={segment.startTimeSeconds} end={segment.endTimeSeconds} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{segment.text}</p>
              </button>
            );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
