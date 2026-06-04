"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";
import { AnalysisValidationPanel } from "@/components/analysis-validation-panel";
import { ContradictionCard } from "@/components/contradiction-card";
import { DemoBanner } from "@/components/demo-banner";
import { EvidenceClipList } from "@/components/evidence-clip-list";
import { EmptyState } from "@/components/empty-state";
import { FindingsPanel } from "@/components/findings-panel";
import { GuidedDemo } from "@/components/guided-demo";
import { KeyboardShortcutsTooltip } from "@/components/keyboard-shortcuts-tooltip";
import { MemoPreview } from "@/components/memo-preview";
import { StatusBadge } from "@/components/status-badge";
import { SupervisorReviewPanel } from "@/components/supervisor-review-panel";
import { TranscriptPanel } from "@/components/transcript-panel";
import { ValueMetricsStrip } from "@/components/value-metrics-strip";
import { WaveformPlayer } from "@/components/waveform-player";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClaimAudioStore } from "@/lib/store/use-claim-audio-store";
import { getProductValueMetrics } from "@/lib/utils/project-metrics";
import { formatTimecode } from "@/lib/utils/time";

export default function EvidenceWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    projects,
    audioAssets,
    transcriptSegments,
    findings,
    contradictions,
    clips,
    exportMemos,
    currentTimeSeconds,
    selectedRange,
    selectedSegmentId,
    selectedFindingId,
    setCurrentTime,
    selectTranscriptSegment,
    selectFinding,
    updateFindingStatus,
    updateContradictionStatus,
    editFinding,
    createClip,
    updateSupervisorReview,
    loadProjectBundle
  } = useClaimAudioStore();
  const project = projects.find((item) => item.id === id);
  const audioAsset = project ? audioAssets.find((asset) => asset.id === project.audioAssetId) : undefined;
  const projectSegments = project
    ? transcriptSegments.filter((segment) => segment.audioAssetId === project.audioAssetId)
    : [];
  const projectFindings = project
    ? findings.filter((finding) => finding.audioAssetId === project.audioAssetId)
    : [];
  const projectContradictions = project
    ? contradictions.filter((contradiction) => contradiction.audioAssetId === project.audioAssetId)
    : [];
  const projectClips = project ? clips.filter((clip) => clip.claimProjectId === project.id) : [];
  const memo = project ? exportMemos.find((item) => item.claimProjectId === project.id) : undefined;
  const selectedFinding = projectFindings.find((finding) => finding.id === selectedFindingId);
  const reviewedFindingCount = projectFindings.filter(
    (finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited"
  ).length;
  const firstHighValueFinding = projectFindings[0];
  const valueMetrics = project
    ? getProductValueMetrics(project, projectFindings, projectContradictions)
    : getProductValueMetrics(
        {
          id: "missing",
          claimNumber: "Missing",
          claimantName: "",
          insuredName: "",
          lossDate: "",
          claimType: "Auto bodily injury",
          lineOfBusiness: "",
          status: "draft",
          audioAssetId: "",
          reviewFlags: {
            readyForReview: false,
            needsSupervisorReview: false,
            siuFlagged: false,
            draftMemoReady: false
          },
          createdAt: "",
          updatedAt: ""
        },
        [],
        []
      );

  useEffect(() => {
    void loadProjectBundle(id);
  }, [id, loadProjectBundle]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();

      if (tagName === "input" || tagName === "textarea" || tagName === "select") {
        return;
      }

      if (!project || !selectedFinding) {
        return;
      }

      if (event.key.toLowerCase() === "a") {
        updateFindingStatus(project.id, selectedFinding.id, "approved");
      }

      if (event.key.toLowerCase() === "r") {
        updateFindingStatus(project.id, selectedFinding.id, "rejected");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [project, selectedFinding, updateFindingStatus]);

  const handleGuidedDemoStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      setCurrentTime(0);
    }

    if ((stepIndex === 2 || stepIndex === 3 || stepIndex === 4) && firstHighValueFinding) {
      selectFinding(firstHighValueFinding);
    }
  };

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

  if (!audioAsset) {
    return <div className="rounded-lg border bg-white p-8">No audio asset found for this project.</div>;
  }

  return (
    <div className="space-y-5">
      <DemoBanner />

      <GuidedDemo onStepChange={handleGuidedDemoStep} />

      <ValueMetricsStrip metrics={valueMetrics} />

      <AnalysisValidationPanel
        audioAsset={audioAsset}
        transcriptSegments={projectSegments}
        findings={projectFindings}
        contradictions={projectContradictions}
      />

      <section className="rounded-lg border bg-white p-4">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{project.claimNumber}</Badge>
              <StatusBadge status={project.status} />
              <Badge variant="neutral">{project.claimType}</Badge>
            </div>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">Evidence Workspace</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Current audio position {formatTimecode(currentTimeSeconds)} | {project.claimantName} recorded statement
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <KeyboardShortcutsTooltip />
            <Link href={`/app/projects/${project.id}/exports`} className={buttonVariants({ variant: "outline" })}>
              <FileText className="h-4 w-4" />
              Export
            </Link>
            <Button
              variant="outline"
              disabled={reviewedFindingCount === 0 || project.reviewFlags.needsSupervisorReview}
              onClick={() => void updateSupervisorReview(project.id, "submit")}
            >
              <ShieldCheck className="h-4 w-4" />
              {project.reviewFlags.needsSupervisorReview ? "Review pending" : "Supervisor review"}
            </Button>
          </div>
        </div>
      </section>

      <SupervisorReviewPanel
        project={project}
        findings={projectFindings}
        contradictions={projectContradictions}
        clips={projectClips}
        exportMemos={exportMemos.filter((item) => item.claimProjectId === project.id)}
        compact
        onAction={(action, note) => void updateSupervisorReview(project.id, action, note)}
      />

      <div className="grid gap-4 2xl:gap-5 xl:grid-cols-[270px_minmax(310px,1fr)_340px] 2xl:grid-cols-[360px_minmax(420px,1fr)_500px]">
        <TranscriptPanel
          segments={projectSegments}
          selectedSegmentId={selectedSegmentId}
          currentTimeSeconds={currentTimeSeconds}
          onSelectSegment={selectTranscriptSegment}
        />
        <div className="space-y-5">
          <WaveformPlayer
            audioAsset={audioAsset}
            findings={projectFindings}
            currentTimeSeconds={currentTimeSeconds}
            selectedRange={selectedRange}
            onTimeChange={setCurrentTime}
            onFindingMarkerClick={selectFinding}
            onCreateClip={() => void createClip(project.id, audioAsset.id)}
          />
          <Tabs defaultValue="clips" className="rounded-lg border bg-white p-4">
            <TabsList>
              <TabsTrigger value="clips">Evidence clips</TabsTrigger>
              <TabsTrigger value="contradictions">Contradictions</TabsTrigger>
              <TabsTrigger value="memo">Memo preview</TabsTrigger>
            </TabsList>
            <TabsContent value="clips">
              <EvidenceClipList
                clips={projectClips}
                onJumpToClip={(clip) => setCurrentTime(clip.startTimeSeconds)}
              />
            </TabsContent>
            <TabsContent value="contradictions">
              {projectContradictions.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No contradictions detected"
                  description="When supported quote-pairs are available, potential inconsistencies will appear here for human review."
                />
              ) : (
                <div className="space-y-3">
                  {projectContradictions.map((contradiction) => (
                    <ContradictionCard
                      key={contradiction.id}
                      projectId={project.id}
                      contradiction={contradiction}
                      onJump={setCurrentTime}
                      onStatusChange={updateContradictionStatus}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="memo">
              <MemoPreview project={project} findings={projectFindings} memo={memo} />
            </TabsContent>
          </Tabs>
        </div>
        <FindingsPanel
          projectId={project.id}
          findings={projectFindings}
          selectedFindingId={selectedFindingId}
          onSelectFinding={selectFinding}
          onStatusChange={updateFindingStatus}
          onEditFinding={editFinding}
        />
      </div>
    </div>
  );
}
