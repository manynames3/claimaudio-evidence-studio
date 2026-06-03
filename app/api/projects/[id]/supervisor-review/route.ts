import { NextRequest } from "next/server";
import { createClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import { assertNeonConfigured, jsonError, jsonOk, requireAuth } from "@/lib/server/api";
import { actorLabel, supervisorRoles, writableRoles } from "@/lib/server/auth";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

type SupervisorReviewRequest =
  | {
      action: "submit";
      note?: string;
    }
  | {
      action: "approve" | "return";
      note?: string;
    };

const nowIso = () => new Date().toISOString();

export async function POST(request: NextRequest, context: RouteContext) {
  const body = (await request.json()) as SupervisorReviewRequest;
  const authResult = await requireAuth(
    request,
    body.action === "submit" ? writableRoles : supervisorRoles
  );

  if (!authResult.ok) {
    return authResult.response;
  }

  const configurationError = assertNeonConfigured();

  if (configurationError) {
    return configurationError;
  }

  try {
    const { id } = await context.params;
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const bundle = await repository.getProjectBundle(id);

    if (!bundle?.project || !bundle.audioAsset) {
      return jsonError("Project or audio asset not found.", 404);
    }

    const reviewedFindingCount = bundle.findings.filter(
      (finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited"
    ).length;

    if (body.action === "submit" && reviewedFindingCount === 0) {
      return jsonError("Approve or edit at least one finding before submitting for supervisor review.", 409);
    }

    const next =
      body.action === "approve"
        ? {
            status: "ready" as const,
            eventType: "supervisorReviewApproved" as const,
            reviewAction: "supervisorApproved" as const,
            summary: `Supervisor approved review packet for ${bundle.project.claimNumber}.`,
            flags: {
              needsSupervisorReview: false,
              supervisorApproved: true,
              supervisorReturned: false,
              draftMemoReady: true
            }
          }
        : body.action === "return"
          ? {
              status: "reviewing" as const,
              eventType: "supervisorReviewReturned" as const,
              reviewAction: "supervisorReturned" as const,
              summary: `Supervisor returned review packet for changes on ${bundle.project.claimNumber}.`,
              flags: {
                needsSupervisorReview: false,
                supervisorApproved: false,
                supervisorReturned: true,
                draftMemoReady: false
              }
            }
          : {
              status: "needsSupervisorReview" as const,
              eventType: "projectSubmittedForSupervisorReview" as const,
              reviewAction: "submittedForSupervisorReview" as const,
              summary: `Submitted ${bundle.project.claimNumber} for supervisor review.`,
              flags: {
                needsSupervisorReview: true,
                supervisorApproved: false,
                supervisorReturned: false,
                draftMemoReady: true
              }
            };

    const project = await repository.updateProjectReviewState(id, next.status, next.flags);

    if (!project) {
      return jsonError("Project not found.", 404);
    }

    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: id,
      audioAssetId: bundle.audioAsset.id,
      eventType: next.eventType,
      actor: actorLabel(authResult.auth),
      targetType: "project",
      targetId: id,
      summary: next.summary,
      metadata: {
        note: body.note,
        reviewedFindingCount,
        actorRole: authResult.auth.role
      },
      createdAt: nowIso()
    });
    await repository.recordUserReviewAction({
      id: `review-${crypto.randomUUID()}`,
      claimProjectId: id,
      audioAssetId: bundle.audioAsset.id,
      targetType: "project",
      targetId: id,
      action: next.reviewAction,
      previousValue: {
        status: bundle.project.status,
        reviewFlags: bundle.project.reviewFlags
      },
      newValue: {
        status: project.status,
        reviewFlags: project.reviewFlags,
        note: body.note
      },
      userId: authResult.auth.userId,
      createdAt: nowIso()
    });

    return jsonOk({ project });
  } catch (error) {
    return jsonError("Failed to update supervisor review workflow.", 500, error instanceof Error ? error.message : error);
  }
}
