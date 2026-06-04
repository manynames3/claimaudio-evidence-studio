"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { ArrowLeft, CheckCircle2, FileArchive, FileText, ShieldCheck } from "lucide-react";
import { ExportCard } from "@/components/export-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { backendApi } from "@/lib/client/backend-api";
import { buildMockExport } from "@/lib/services";
import { useClaimAudioStore } from "@/lib/store/use-claim-audio-store";
import type { ExportMemo } from "@/lib/types";

export default function ExportCenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    backendMode,
    projects,
    findings,
    transcriptSegments,
    contradictions,
    clips,
    exportMemos,
    loadProjectBundle,
    recordExportGenerated
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

  const projectFindings = findings.filter((finding) => finding.audioAssetId === project.audioAssetId);
  const projectSegments = transcriptSegments.filter((segment) => segment.audioAssetId === project.audioAssetId);
  const projectContradictions = contradictions.filter((contradiction) => contradiction.audioAssetId === project.audioAssetId);
  const projectClips = clips.filter((clip) => clip.claimProjectId === project.id);
  const reviewedFindings = projectFindings.filter(
    (finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited"
  );
  const reviewedContradictions = projectContradictions.filter(
    (contradiction) => contradiction.reviewStatus === "approved" || contradiction.reviewStatus === "edited"
  );

  const exportTypes: ExportMemo["exportType"][] = [
    "statementSummary",
    "timestampedEvidenceMemo",
    "contradictionReport",
    "transcript",
    "supervisorReviewPacket"
  ];
  const exportCards = exportTypes.map((exportType) =>
    buildMockExport({
      project,
      findings:
        exportType === "statementSummary" || exportType === "timestampedEvidenceMemo"
          ? reviewedFindings
          : projectFindings,
      transcriptSegments: projectSegments,
      contradictions:
        exportType === "contradictionReport" ? reviewedContradictions : projectContradictions,
      clips: projectClips,
      exportType
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <Badge variant="info">Export center</Badge>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{project.claimNumber}</h1>
        </div>
        <Link href={`/app/projects/${project.id}/workspace`} className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <FileText className="h-5 w-5 text-cyan-800" />
            <div>
              <p className="text-sm font-semibold">{projectFindings.length} evidence findings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <ShieldCheck className="h-5 w-5 text-cyan-800" />
            <div>
              <p className="text-sm font-semibold">{projectContradictions.length} contradictions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <FileArchive className="h-5 w-5 text-cyan-800" />
            <div>
              <p className="text-sm font-semibold">{projectClips.length} evidence clips</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-800" />
              <h2 className="text-sm font-semibold text-slate-950">Claim-file export gates</h2>
              <Badge variant={reviewedFindings.length ? "success" : "warning"}>
                {reviewedFindings.length ? "Evidence ready" : "Review required"}
              </Badge>
              <Badge variant={project.reviewFlags.supervisorApproved ? "success" : "neutral"}>
                {project.reviewFlags.supervisorApproved ? "Supervisor approved" : "Supervisor optional"}
              </Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Statement summary and evidence memo exports include only approved or edited findings. Contradiction reports include only approved contradiction pairs. Generation and download are audited when the backend is enabled.
            </p>
          </div>
          <div className="grid min-w-[280px] gap-2 text-sm">
            <ExportGateRow ready={reviewedFindings.length > 0} label="Reviewed findings" value={`${reviewedFindings.length}/${projectFindings.length}`} />
            <ExportGateRow
              ready={projectContradictions.length === 0 || reviewedContradictions.length > 0}
              label="Reviewed contradictions"
              value={`${reviewedContradictions.length}/${projectContradictions.length}`}
            />
            <ExportGateRow
              ready={exportMemos.filter((memo) => memo.claimProjectId === project.id).length > 0}
              label="Generated exports"
              value={`${exportMemos.filter((memo) => memo.claimProjectId === project.id).length}`}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <CardHeader className="border-b py-3">
          <CardTitle>Available exports</CardTitle>
        </CardHeader>
        <div className="grid gap-4 p-4 xl:grid-cols-2 2xl:grid-cols-3">
          {exportCards.map((card) => (
            <ExportCard
              key={card.title}
              {...card}
              testId={`export-card-${card.exportType}`}
              disabled={
                (["statementSummary", "timestampedEvidenceMemo"].includes(card.exportType) &&
                  reviewedFindings.length === 0) ||
                (card.exportType === "contradictionReport" && reviewedContradictions.length === 0)
              }
              gateMessage={
                card.exportType === "contradictionReport"
                  ? "Approve at least one contradiction before generating this report."
                  : "Approve or edit at least one finding before generating this claim-file export."
              }
              onGenerate={async () => {
                if (backendMode === "neon") {
                  const { generatedExport, exportMemo } = await backendApi.generateExport(project.id, card.exportType);

                  await loadProjectBundle(project.id);

                  return {
                    ...generatedExport,
                    exportMemoId: exportMemo.id
                  };
                }

                recordExportGenerated(project.id, project.audioAssetId, card.exportType, card.fileName);
                return card;
              }}
              onDownload={async (generated) => {
                if (backendMode === "neon" && generated.exportMemoId) {
                  const downloadResult = await backendApi.recordExportDownload(project.id, {
                    exportMemoId: generated.exportMemoId,
                    fileName: generated.fileName,
                    exportType: card.exportType
                  });
                  await loadProjectBundle(project.id);

                  return downloadResult;
                }
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ExportGateRow({ ready, label, value }: { ready: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2">
      <span className="flex items-center gap-2 text-slate-700">
        <CheckCircle2 className={ready ? "h-4 w-4 text-emerald-700" : "h-4 w-4 text-amber-700"} />
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-950">{value}</span>
    </div>
  );
}
