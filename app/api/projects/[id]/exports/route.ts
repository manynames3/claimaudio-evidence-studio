import { NextRequest } from "next/server";
import { createClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import { exportService } from "@/lib/services";
import { assertNeonConfigured, jsonError, jsonOk, requireAuth } from "@/lib/server/api";
import { actorLabel, exportRoles } from "@/lib/server/auth";
import type { EvidenceFinding, ExportMemo } from "@/lib/types";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

type ExportRequest = {
  exportType: ExportMemo["exportType"];
};

const nowIso = () => new Date().toISOString();

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth(request, exportRoles);

  if (!authResult.ok) {
    return authResult.response;
  }

  const configurationError = assertNeonConfigured();

  if (configurationError) {
    return configurationError;
  }

  try {
    const { id } = await context.params;
    const { exportType } = (await request.json()) as ExportRequest;
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const bundle = await repository.getProjectBundle(id);

    if (!bundle?.project || !bundle.audioAsset) {
      return jsonError("Project or audio asset not found.", 404);
    }

    const reviewedFindings = bundle.findings.filter(isReviewedFinding);
    const claimFileExportTypes: ExportMemo["exportType"][] = [
      "statementSummary",
      "timestampedEvidenceMemo"
    ];

    if (claimFileExportTypes.includes(exportType) && reviewedFindings.length === 0) {
      return jsonError(
        "At least one approved or edited finding is required before generating a claim-file evidence export.",
        409,
        {
          exportType,
          pendingFindings: bundle.findings.filter((finding) => finding.reviewStatus === "pending").length,
          rejectedFindings: bundle.findings.filter((finding) => finding.reviewStatus === "rejected").length
        }
      );
    }

    // TODO: Store generated PDF/DOCX/HTML in encrypted S3 and return a signed download URL.
    // TODO: Production PDF/DOCX exports should include reviewer signature, tenant retention label, and S3/KMS object metadata.
    const generatedExport = await exportService.generateExport({
      project: bundle.project,
      findings: exportType === "supervisorReviewPacket" ? bundle.findings : reviewedFindings,
      transcriptSegments: bundle.transcriptSegments,
      contradictions: bundle.contradictions,
      clips: bundle.clips,
      exportType
    });
    const exportMemo: ExportMemo = {
      id: `export-${crypto.randomUUID()}`,
      claimProjectId: bundle.project.id,
      audioAssetId: bundle.audioAsset.id,
      exportType,
      title: generatedExport.title,
      content: generatedExport.content,
      includedFindingIds: bundle.findings
        .filter(isReviewedFinding)
        .map((finding) => finding.id),
      includedContradictionIds: bundle.contradictions.map((contradiction) => contradiction.id),
      includedClipIds: bundle.clips.map((clip) => clip.id),
      createdAt: nowIso()
    };

    await repository.insertExportMemo(exportMemo);
    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: bundle.project.id,
      audioAssetId: bundle.audioAsset.id,
      eventType: "exportGenerated",
      actor: actorLabel(authResult.auth),
      targetType: "export",
      targetId: exportMemo.id,
      summary: `Generated export: ${generatedExport.fileName}.`,
      metadata: {
        exportType,
        format: generatedExport.format,
        reviewedFindingCount: reviewedFindings.length,
        generatedBy: authResult.auth.userId
      },
      createdAt: nowIso()
    });
    await repository.recordUserReviewAction({
      id: `review-${crypto.randomUUID()}`,
      claimProjectId: bundle.project.id,
      audioAssetId: bundle.audioAsset.id,
      targetType: "export",
      targetId: exportMemo.id,
      action: "exported",
      newValue: {
        exportType,
        fileName: generatedExport.fileName,
        includedFindingIds: exportMemo.includedFindingIds
      },
      userId: authResult.auth.userId,
      createdAt: nowIso()
    });

    return jsonOk({ generatedExport, exportMemo });
  } catch (error) {
    return jsonError("Failed to generate export.", 500, error instanceof Error ? error.message : error);
  }
}

function isReviewedFinding(finding: EvidenceFinding) {
  return finding.reviewStatus === "approved" || finding.reviewStatus === "edited";
}
