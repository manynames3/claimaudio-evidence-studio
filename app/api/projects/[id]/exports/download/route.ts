import { NextRequest } from "next/server";
import { createClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import { assertNeonConfigured, jsonError, jsonOk, requireAuth } from "@/lib/server/api";
import { actorLabel, exportRoles } from "@/lib/server/auth";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

type DownloadExportRequest = {
  exportMemoId: string;
  fileName: string;
  exportType: string;
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
    const body = (await request.json()) as DownloadExportRequest;
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const bundle = await repository.getProjectBundle(id);
    const exportMemo = bundle?.exportMemos.find((memo) => memo.id === body.exportMemoId);

    if (!bundle?.project || !bundle.audioAsset || !exportMemo) {
      return jsonError("Project or export not found.", 404);
    }

    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: bundle.project.id,
      audioAssetId: bundle.audioAsset.id,
      eventType: "exportDownloaded",
      actor: actorLabel(authResult.auth),
      targetType: "export",
      targetId: exportMemo.id,
      summary: `Downloaded export: ${body.fileName}.`,
      metadata: {
        exportType: body.exportType,
        fileName: body.fileName,
        downloadedBy: authResult.auth.userId
      },
      createdAt: nowIso()
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError("Failed to record export download.", 500, error instanceof Error ? error.message : error);
  }
}
