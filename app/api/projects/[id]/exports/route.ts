import { NextRequest } from "next/server";
import { createClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import { exportService } from "@/lib/services";
import { AwsExportArtifactService } from "@/lib/services/aws";
import { assertNeonConfigured, jsonError, jsonOk, requireAuth } from "@/lib/server/api";
import { actorLabel, exportRoles } from "@/lib/server/auth";
import { getAwsRuntimeConfig } from "@/lib/server/env";
import type { Contradiction, EvidenceFinding, ExportMemo, GeneratedExport } from "@/lib/types";

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
    const reviewedContradictions = bundle.contradictions.filter(isReviewedContradiction);
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

    if (exportType === "contradictionReport" && reviewedContradictions.length === 0) {
      return jsonError(
        "At least one approved contradiction is required before generating a contradiction report.",
        409,
        {
          exportType,
          pendingContradictions: bundle.contradictions.filter(
            (contradiction) => contradiction.reviewStatus === "pending"
          ).length,
          rejectedContradictions: bundle.contradictions.filter(
            (contradiction) => contradiction.reviewStatus === "rejected"
          ).length
        }
      );
    }

    const generatedExport = await exportService.generateExport({
      project: bundle.project,
      findings: exportType === "supervisorReviewPacket" ? bundle.findings : reviewedFindings,
      transcriptSegments: bundle.transcriptSegments,
      contradictions: exportType === "supervisorReviewPacket" ? bundle.contradictions : reviewedContradictions,
      clips: bundle.clips,
      exportType,
      reviewer: {
        displayName: authResult.auth.displayName,
        email: authResult.auth.email,
        role: authResult.auth.role,
        userId: authResult.auth.userId,
        tenantId: authResult.auth.tenantId
      }
    });
    const storedExport = await storeExportArtifactIfConfigured(bundle.project.id, generatedExport);
    const generatedExportWithStorage = storedExport
      ? {
          ...generatedExport,
          storageKey: storedExport.storageKey,
          downloadUrl: storedExport.downloadUrl,
          expiresAt: storedExport.expiresAt
        }
      : generatedExport;
    const exportMemo: ExportMemo = {
      id: `export-${crypto.randomUUID()}`,
      claimProjectId: bundle.project.id,
      audioAssetId: bundle.audioAsset.id,
      exportType,
      title: generatedExportWithStorage.title,
      content: generatedExportWithStorage.content,
      includedFindingIds:
        exportType === "supervisorReviewPacket"
          ? bundle.findings.map((finding) => finding.id)
          : reviewedFindings.map((finding) => finding.id),
      includedContradictionIds:
        exportType === "supervisorReviewPacket"
          ? bundle.contradictions.map((contradiction) => contradiction.id)
          : reviewedContradictions.map((contradiction) => contradiction.id),
      includedClipIds: bundle.clips.map((clip) => clip.id),
      s3ExportKey: storedExport?.storageKey,
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
      summary: `Generated export: ${generatedExportWithStorage.fileName}.`,
      metadata: {
        exportType,
        format: generatedExportWithStorage.format,
        reviewedFindingCount: reviewedFindings.length,
        reviewedContradictionCount: reviewedContradictions.length,
        storageMode: storedExport ? "s3-signed-url" : "browser-download",
        s3ExportKey: storedExport?.storageKey,
        signedDownloadExpiresAt: storedExport?.expiresAt,
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
        fileName: generatedExportWithStorage.fileName,
        storageMode: storedExport ? "s3-signed-url" : "browser-download",
        includedFindingIds: exportMemo.includedFindingIds,
        includedContradictionIds: exportMemo.includedContradictionIds
      },
      userId: authResult.auth.userId,
      createdAt: nowIso()
    });

    return jsonOk({ generatedExport: generatedExportWithStorage, exportMemo });
  } catch (error) {
    return jsonError("Failed to generate export.", 500, error instanceof Error ? error.message : error);
  }
}

function isReviewedFinding(finding: EvidenceFinding) {
  return finding.reviewStatus === "approved" || finding.reviewStatus === "edited";
}

function isReviewedContradiction(contradiction: Contradiction) {
  return contradiction.reviewStatus === "approved" || contradiction.reviewStatus === "edited";
}

async function storeExportArtifactIfConfigured(
  claimProjectId: string,
  generatedExport: GeneratedExport
) {
  if (!hasAwsExportStorageConfig()) {
    return undefined;
  }

  const exportArtifactService = new AwsExportArtifactService();

  return exportArtifactService.storeExportArtifact({
    claimProjectId,
    generatedExport
  });
}

function hasAwsExportStorageConfig() {
  const { exportBucket, kmsKeyArn } = getAwsRuntimeConfig();

  return Boolean(
    exportBucket &&
      kmsKeyArn &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}
