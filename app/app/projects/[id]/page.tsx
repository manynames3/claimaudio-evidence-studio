"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { ArrowRight, ClipboardCheck, FileAudio, FileText, ShieldAlert } from "lucide-react";
import { AuditLogPanel } from "@/components/audit-log-panel";
import { DemoBanner } from "@/components/demo-banner";
import { ProcessingStepper } from "@/components/processing-stepper";
import { SupervisorReviewPanel } from "@/components/supervisor-review-panel";
import { ValueMetricsStrip } from "@/components/value-metrics-strip";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Timecode } from "@/components/timecode";
import { useClaimAudioStore } from "@/lib/store/use-claim-audio-store";
import { getProductValueMetrics } from "@/lib/utils/project-metrics";
import { formatTimecode } from "@/lib/utils/time";

export default function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    projects,
    audioAssets,
    findings,
    transcriptSegments,
    contradictions,
    clips,
    auditEvents,
    processingRuns,
    loadProjectBundle,
    retryProcessing,
    updateSupervisorReview
  } = useClaimAudioStore();
  const project = projects.find((item) => item.id === id);

  useEffect(() => {
    void loadProjectBundle(id);
  }, [id, loadProjectBundle]);

  if (!project) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <h1 className="text-lg font-semibold">Project not found</h1>
        <Link href="/app" className={buttonVariants({ className: "mt-4" })}>
          Return to dashboard
        </Link>
      </div>
    );
  }

  const audioAsset = audioAssets.find((asset) => asset.id === project.audioAssetId);
  const projectFindings = findings.filter((finding) => finding.audioAssetId === project.audioAssetId);
  const projectSegments = transcriptSegments.filter((segment) => segment.audioAssetId === project.audioAssetId);
  const projectContradictions = contradictions.filter((contradiction) => contradiction.audioAssetId === project.audioAssetId);
  const projectClips = clips.filter((clip) => clip.claimProjectId === project.id);
  const projectAuditEvents = auditEvents.filter((event) => event.claimProjectId === project.id);
  const processingRun = processingRuns[project.id];
  const transcriptStatus =
    audioAsset?.processingStatus === "readyForReview"
      ? "Ready"
      : audioAsset?.processingStatus === "transcribing"
        ? "Transcribing"
        : audioAsset?.processingStatus === "uploaded"
          ? "Queued"
          : audioAsset?.processingStatus === "failed"
            ? "Failed"
            : "Pending";
  const analysisStatus =
    audioAsset?.processingStatus === "readyForReview"
      ? "Ready for review"
      : audioAsset?.processingStatus === "analyzing"
        ? "Analyzing"
        : audioAsset?.processingStatus === "failed"
          ? "Failed"
          : "Waiting";
  const topFindings = projectFindings
    .filter((finding) => finding.severity === "high" || finding.reviewStatus === "approved")
    .slice(0, 5);
  const valueMetrics = getProductValueMetrics(project, projectFindings, projectContradictions);

  return (
    <div className="space-y-4">
      <DemoBanner />

      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <Badge variant="info">{project.lineOfBusiness}</Badge>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{project.claimNumber}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/projects/${project.id}/exports`} className={buttonVariants({ variant: "outline" })}>
            <FileText className="h-4 w-4" />
            Export center
          </Link>
          <Link href={`/app/projects/${project.id}/workspace`} className={buttonVariants()}>
            Evidence Workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <ValueMetricsStrip metrics={valueMetrics} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewTile label="Transcript status" value={transcriptStatus} icon={ClipboardCheck} />
        <OverviewTile label="AI analysis status" value={analysisStatus} icon={ShieldAlert} />
        <OverviewTile label="Transcript segments" value={projectSegments.length.toString()} icon={FileText} />
        <OverviewTile label="Evidence clips" value={projectClips.length.toString()} icon={FileAudio} />
      </div>

      {processingRun && processingRun.status !== "readyForReview" && (
        <ProcessingStepper
          processingRun={processingRun}
          onRetry={() => retryProcessing(project.id)}
        />
      )}

      <SupervisorReviewPanel
        project={project}
        findings={projectFindings}
        onAction={(action) => void updateSupervisorReview(project.id, action)}
      />

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Claim details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DetailRow label="Claimant" value={project.claimantName} />
            <DetailRow label="Insured" value={project.insuredName} />
            <DetailRow label="Date of loss" value={project.lossDate} />
            <DetailRow label="Claim type" value={project.claimType} />
            <DetailRow label="Line of business" value={project.lineOfBusiness} />
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-muted-foreground">Project status</span>
              <StatusBadge status={project.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audio asset and analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{audioAsset?.fileName || "No audio asset"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Duration {formatTimecode(audioAsset?.durationSeconds || 0)} | Source {audioAsset?.sourceType || "unknown"}
                  </p>
                </div>
                {audioAsset && <StatusBadge status={audioAsset.processingStatus} />}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <MiniMetric label="Findings" value={projectFindings.length.toString()} />
              <MiniMetric label="Contradictions" value={projectContradictions.length.toString()} />
              <MiniMetric
                label="Approved"
                value={projectFindings.filter((finding) => finding.reviewStatus === "approved").length.toString()}
              />
            </div>
            <Link
              href={`/app/projects/${project.id}/workspace`}
              className={buttonVariants({ className: "w-full" })}
            >
              Enter Evidence Workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <section className="rounded-lg border bg-white">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold">Top findings</h2>
        </div>
        <div className="grid gap-3 p-4 xl:grid-cols-2">
          {topFindings.map((finding) => (
            <article key={finding.id} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant={finding.category === "SIU Flag" ? "danger" : "info"}>{finding.category}</Badge>
                  <h3 className="mt-2 text-sm font-semibold">{finding.title}</h3>
                </div>
                <Timecode start={finding.startTimeSeconds} end={finding.endTimeSeconds} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">"{finding.exactQuote}"</p>
            </article>
          ))}
        </div>
      </section>

      <AuditLogPanel events={projectAuditEvents} title="Project Audit Log" />
    </div>
  );
}

function OverviewTile({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 pt-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-lg font-semibold">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-cyan-800" />
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
