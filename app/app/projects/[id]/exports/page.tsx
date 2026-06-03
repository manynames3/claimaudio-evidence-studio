"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { ArrowLeft, FileArchive, FileText, ShieldCheck } from "lucide-react";
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
