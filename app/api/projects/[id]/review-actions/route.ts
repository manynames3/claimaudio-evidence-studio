import { NextRequest } from "next/server";
import { createClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import { assertNeonConfigured, jsonError, jsonOk, requireAuth } from "@/lib/server/api";
import { actorLabel, writableRoles } from "@/lib/server/auth";
import type { EvidenceFinding, ReviewStatus } from "@/lib/types";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

type ReviewActionRequest =
  | {
      findingId: string;
      reviewStatus: Extract<ReviewStatus, "approved" | "rejected">;
    }
  | {
      findingId: string;
      reviewStatus: "edited";
      updates: Pick<EvidenceFinding, "title" | "whyItMatters" | "recommendedFollowUp" | "notes">;
    }
  | {
      contradictionId: string;
      reviewStatus: Extract<ReviewStatus, "approved" | "rejected">;
    };

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
    const body = (await request.json()) as ReviewActionRequest;
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const bundle = await repository.getProjectBundle(id);

    if ("contradictionId" in body) {
      const currentContradiction = bundle?.contradictions.find(
        (contradiction) => contradiction.id === body.contradictionId
      );

      if (!bundle?.project || !currentContradiction) {
        return jsonError("Project or contradiction not found.", 404);
      }

      const updatedContradiction = await repository.updateContradictionReviewStatus(
        body.contradictionId,
        body.reviewStatus
      );

      if (!updatedContradiction) {
        return jsonError("Contradiction not found.", 404);
      }

      await repository.recordAuditEvent({
        id: `audit-${crypto.randomUUID()}`,
        claimProjectId: bundle.project.id,
        audioAssetId: currentContradiction.audioAssetId,
        eventType: body.reviewStatus === "approved" ? "contradictionApproved" : "contradictionRejected",
        actor: actorLabel(authResult.auth),
        targetType: "contradiction",
        targetId: body.contradictionId,
        summary: `${body.reviewStatus === "approved" ? "Approved" : "Rejected"} contradiction: ${
          updatedContradiction.title
        }.`,
        metadata: {
          previousStatus: currentContradiction.reviewStatus,
          newStatus: updatedContradiction.reviewStatus,
          timestampA: updatedContradiction.timestampA,
          timestampB: updatedContradiction.timestampB
        },
        createdAt: nowIso()
      });
      await repository.recordUserReviewAction({
        id: `review-${crypto.randomUUID()}`,
        claimProjectId: bundle.project.id,
        audioAssetId: currentContradiction.audioAssetId,
        targetType: "contradiction",
        targetId: body.contradictionId,
        action: body.reviewStatus,
        previousValue: currentContradiction,
        newValue: updatedContradiction,
        userId: authResult.auth.userId,
        createdAt: nowIso()
      });

      return jsonOk({ contradiction: updatedContradiction });
    }

    const currentFinding = bundle?.findings.find((finding) => finding.id === body.findingId);

    if (!bundle?.project || !currentFinding) {
      return jsonError("Project or finding not found.", 404);
    }

    const updatedFinding =
      body.reviewStatus === "edited"
        ? await repository.editFinding(body.findingId, body.updates)
        : await repository.updateFindingReviewStatus(body.findingId, body.reviewStatus);

    if (!updatedFinding) {
      return jsonError("Finding not found.", 404);
    }

    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: bundle.project.id,
      audioAssetId: currentFinding.audioAssetId,
      eventType:
        body.reviewStatus === "approved"
          ? "findingApproved"
          : body.reviewStatus === "rejected"
            ? "findingRejected"
            : "findingEdited",
      actor: actorLabel(authResult.auth),
      targetType: "finding",
      targetId: body.findingId,
      summary:
        body.reviewStatus === "edited"
          ? `Edited finding interpretation: ${updatedFinding.title}.`
          : `${body.reviewStatus === "approved" ? "Approved" : "Rejected"} finding: ${updatedFinding.title}.`,
      metadata: {
        previousStatus: currentFinding.reviewStatus,
        newStatus: updatedFinding.reviewStatus,
        category: updatedFinding.category,
        timestamp: `${updatedFinding.startTimeSeconds}-${updatedFinding.endTimeSeconds}`
      },
      createdAt: nowIso()
    });
    await repository.recordUserReviewAction({
      id: `review-${crypto.randomUUID()}`,
      claimProjectId: bundle.project.id,
      audioAssetId: currentFinding.audioAssetId,
      targetType: "finding",
      targetId: body.findingId,
      action: body.reviewStatus === "edited" ? "edited" : body.reviewStatus,
      previousValue: currentFinding,
      newValue: updatedFinding,
      userId: authResult.auth.userId,
      createdAt: nowIso()
    });

    return jsonOk({ finding: updatedFinding });
  } catch (error) {
    return jsonError("Failed to record review action.", 500, error instanceof Error ? error.message : error);
  }
}
