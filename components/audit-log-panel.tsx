"use client";

import { Activity, CheckCircle2, FileText, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import type { AuditLogEvent } from "@/lib/types";

interface AuditLogPanelProps {
  events: AuditLogEvent[];
  title?: string;
  compact?: boolean;
}

const eventLabels: Record<AuditLogEvent["eventType"], string> = {
  projectCreated: "Project created",
  audioUploaded: "Audio uploaded",
  transcriptionStarted: "Transcription started",
  transcriptionCompleted: "Transcription completed",
  analysisStarted: "Analysis started",
  analysisCompleted: "Analysis completed",
  findingApproved: "Finding approved",
  findingRejected: "Finding rejected",
  findingEdited: "Finding edited",
  clipCreated: "Clip created",
  exportGenerated: "Export generated",
  exportDownloaded: "Export downloaded",
  projectSubmittedForSupervisorReview: "Submitted for supervisor review",
  supervisorReviewApproved: "Supervisor approved",
  supervisorReviewReturned: "Supervisor returned",
  retentionPolicyUpdated: "Retention policy updated",
  securitySettingUpdated: "Security setting updated"
};

export function AuditLogPanel({ events, title = "Audit Log", compact = false }: AuditLogPanelProps) {
  const [search, setSearch] = useState("");
  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return events
      .filter(
        (event) =>
          !normalizedSearch ||
          event.summary.toLowerCase().includes(normalizedSearch) ||
          eventLabels[event.eventType].toLowerCase().includes(normalizedSearch) ||
          event.actor.toLowerCase().includes(normalizedSearch)
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [events, search]);

  return (
    <section className="rounded-lg border bg-white">
      <div className="flex flex-col justify-between gap-3 border-b p-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Immutable-style review events for claim evidence activity.
          </p>
        </div>
        <Badge variant="neutral">{filteredEvents.length} events</Badge>
      </div>
      {!compact && (
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search audit activity"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      )}
      <div className={`claims-scrollbar overflow-auto ${compact ? "max-h-80" : "max-h-[520px]"}`}>
        {filteredEvents.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No audit events recorded yet.</p>
        ) : (
          <div className="divide-y">
            {filteredEvents.map((event) => (
              <article className="flex gap-3 p-4" key={event.id}>
                <AuditIcon event={event} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{eventLabels[event.eventType]}</p>
                    <Badge variant="neutral">{event.actor}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{event.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatAuditTimestamp(event.createdAt)} | {event.targetType}:{event.targetId}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function formatAuditTimestamp(createdAt: string) {
  return createdAt.replace("T", " ").slice(0, 16);
}

function AuditIcon({ event }: { event: AuditLogEvent }) {
  const Icon =
    event.eventType === "exportGenerated"
      ? FileText
      : event.eventType.includes("finding") ||
          event.eventType.includes("supervisor") ||
          event.eventType === "analysisCompleted"
        ? ShieldCheck
        : event.eventType === "transcriptionCompleted" || event.eventType === "analysisStarted"
          ? CheckCircle2
          : Activity;

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-900">
      <Icon className="h-4 w-4" />
    </div>
  );
}
