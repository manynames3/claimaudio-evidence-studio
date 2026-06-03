import { NextRequest } from "next/server";
import { createClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import { assertNeonConfigured, jsonError, jsonOk, requireAuth } from "@/lib/server/api";
import { actorLabel, writableRoles } from "@/lib/server/auth";
import type { EvidenceClip } from "@/lib/types";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

type CreateClipRequest = Pick<
  EvidenceClip,
  "audioAssetId" | "title" | "startTimeSeconds" | "endTimeSeconds" | "transcriptExcerpt" | "linkedFindingIds"
>;

const nowIso = () => new Date().toISOString();

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth(request, writableRoles);

  if (!authResult.ok) {
    return authResult.response;
  }

  const configurationError = assertNeonConfigured();

  if (configurationError) {
    return configurationError;
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as CreateClipRequest;
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const bundle = await repository.getProjectBundle(id);

    if (!bundle?.project || !bundle.audioAsset || bundle.audioAsset.id !== body.audioAssetId) {
      return jsonError("Project or audio asset not found.", 404);
    }

    // TODO: Production implementation should invoke AWS media clipping against encrypted S3 audio.
    const clip: EvidenceClip = {
      id: `clip-${crypto.randomUUID()}`,
      claimProjectId: id,
      audioAssetId: body.audioAssetId,
      title: body.title,
      startTimeSeconds: body.startTimeSeconds,
      endTimeSeconds: body.endTimeSeconds,
      transcriptExcerpt: body.transcriptExcerpt,
      linkedFindingIds: body.linkedFindingIds,
      createdBy: actorLabel(authResult.auth),
      createdAt: nowIso()
    };

    await repository.createClip(clip);
    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: id,
      audioAssetId: body.audioAssetId,
      eventType: "clipCreated",
      actor: actorLabel(authResult.auth),
      targetType: "clip",
      targetId: clip.id,
      summary: `Created evidence clip: ${clip.title}.`,
      metadata: {
        startTimeSeconds: clip.startTimeSeconds,
        endTimeSeconds: clip.endTimeSeconds,
        linkedFindingIds: clip.linkedFindingIds
      },
      createdAt: nowIso()
    });
    await repository.recordUserReviewAction({
      id: `review-${crypto.randomUUID()}`,
      claimProjectId: id,
      audioAssetId: body.audioAssetId,
      targetType: "clip",
      targetId: clip.id,
      action: "clipCreated",
      newValue: clip,
      userId: authResult.auth.userId,
      createdAt: nowIso()
    });

    return jsonOk({ clip }, { status: 201 });
  } catch (error) {
    return jsonError("Failed to create evidence clip.", 500, error instanceof Error ? error.message : error);
  }
}
