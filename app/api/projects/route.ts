import { NextRequest } from "next/server";
import { createClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import {
  mockAuditEvents,
  mockAudioAssets,
  mockContradictions,
  mockEvidenceClips,
  mockExportMemos,
  mockFindings,
  mockProjects
} from "@/lib/mock-data";
import { storageService } from "@/lib/services";
import { AwsStorageService } from "@/lib/services/aws";
import { withRangeServedDemoAudioAssets } from "@/lib/demo-audio/audio-url";
import { assertNeonConfigured, jsonError, jsonOk, requireAuth } from "@/lib/server/api";
import { actorLabel, writableRoles } from "@/lib/server/auth";
import { getRuntimeBackendStatus } from "@/lib/server/env";
import type { SignedUploadUrlResult } from "@/lib/services/storage-service";
import type { AudioAsset, ClaimProject } from "@/lib/types";

type CreateProjectRequest = Omit<
  ClaimProject,
  "id" | "audioAssetId" | "createdAt" | "updatedAt" | "status" | "reviewFlags"
> & {
  sourceType?: AudioAsset["sourceType"];
  fileName?: string;
  contentType?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
};

const nowIso = () => new Date().toISOString();
const maxAudioUploadBytes = 100 * 1024 * 1024;
const acceptedAudioExtensions = new Set(["mp3", "mp4", "m4a", "wav", "flac", "ogg", "webm", "amr"]);
const acceptedAudioContentTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/mp4a-latm",
  "audio/x-m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/flac",
  "audio/ogg",
  "audio/webm",
  "audio/amr",
  "video/mp4"
]);

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const status = getRuntimeBackendStatus();

  if (!status.neonConfigured) {
    return jsonOk({
      backend: status,
      projects: mockProjects,
      audioAssets: withRangeServedDemoAudioAssets(mockAudioAssets),
      findings: mockFindings,
      contradictions: mockContradictions,
      clips: mockEvidenceClips,
      exportMemos: mockExportMemos,
      auditEvents: mockAuditEvents,
      mode: "mock-readonly"
    });
  }

  try {
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const dashboardData = await repository.listDashboardData();

    return jsonOk({
      backend: status,
      ...dashboardData,
      audioAssets: withRangeServedDemoAudioAssets(dashboardData.audioAssets),
      mode: "neon"
    });
  } catch (error) {
    return jsonError("Failed to list projects from Neon.", 500, error instanceof Error ? error.message : error);
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request, writableRoles);

  if (!authResult.ok) {
    return authResult.response;
  }

  const configurationError = assertNeonConfigured();

  if (configurationError) {
    return configurationError;
  }

  try {
    const body = (await request.json()) as CreateProjectRequest;
    const projectId = `claim-${crypto.randomUUID().slice(0, 8)}`;
    const sourceType = body.sourceType || "sample";
    const audioAssetId = `audio-${projectId}-${sourceType}`;
    const project: ClaimProject = {
      id: projectId,
      claimNumber: body.claimNumber,
      claimantName: body.claimantName,
      insuredName: body.insuredName,
      lossDate: body.lossDate,
      claimType: body.claimType,
      lineOfBusiness: body.lineOfBusiness,
      status: "uploaded",
      audioAssetId,
      reviewFlags: {
        readyForReview: false,
        needsSupervisorReview: false,
        siuFlagged: false,
        draftMemoReady: false
      },
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    let signedUpload: SignedUploadUrlResult | undefined;
    let audioAsset: AudioAsset;

    if (sourceType === "uploaded") {
      const validationError = validateAudioUploadRequest(body);

      if (validationError) {
        return jsonError(validationError, 400);
      }

      const backendStatus = getRuntimeBackendStatus();

      if (!backendStatus.awsConfigured) {
        return jsonError(
          "AWS S3 upload is not configured for real recorded statement uploads. Use the sample statement or configure AWS upload/transcription services.",
          503,
          { missingEnv: backendStatus.missingAwsEnv }
        );
      }
    }

    if (sourceType === "uploaded") {
      const awsStorageService = new AwsStorageService();

      signedUpload = await awsStorageService.createSignedUploadUrl({
        claimProjectId: projectId,
        fileName: body.fileName || "uploaded_recorded_statement.wav",
        contentType: body.contentType || "application/octet-stream"
      });
      audioAsset = {
        id: audioAssetId,
        claimProjectId: projectId,
        fileName: body.fileName || "uploaded_recorded_statement.wav",
        durationSeconds: body.durationSeconds || 0,
        sourceType,
        processingStatus: "uploaded",
        storageUrl: signedUpload.storageKey,
        createdAt: nowIso()
      };
    } else {
      audioAsset = await storageService.createMockAudioAsset({
        id: audioAssetId,
        claimProjectId: projectId,
        sourceType,
        fileName:
          body.fileName ||
          (sourceType === "sample"
            ? "sample_auto_bi_recorded_statement.wav"
            : "uploaded_recorded_statement.wav")
      });
    }
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const actor = actorLabel(authResult.auth);

    await repository.createProjectWithAudioAsset(project, audioAsset);
    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: project.id,
      audioAssetId: audioAsset.id,
      eventType: "projectCreated",
      actor,
      targetType: "project",
      targetId: project.id,
      summary: `Project ${project.claimNumber} created.`,
      createdAt: nowIso()
    });
    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: project.id,
      audioAssetId: audioAsset.id,
      eventType: "audioUploaded",
      actor,
      targetType: "audio",
      targetId: audioAsset.id,
      summary: `${sourceType === "sample" ? "Sample statement selected" : "Audio upload registered"} for processing.`,
      metadata: {
        sourceType,
        storageRegistered: Boolean(audioAsset.storageUrl),
        uploadedBy: authResult.auth.userId
      },
      createdAt: nowIso()
    });

    return jsonOk({ project, audioAsset, signedUpload }, { status: 201 });
  } catch (error) {
    return jsonError("Failed to create project in Neon.", 500, error instanceof Error ? error.message : error);
  }
}

function validateAudioUploadRequest(body: CreateProjectRequest) {
  const fileName = body.fileName || "";
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const contentType = (body.contentType || "").toLowerCase();

  if (!fileName.trim()) {
    return "Upload requires an audio file name.";
  }

  if (!acceptedAudioExtensions.has(extension)) {
    return "Unsupported audio format. Use mp3, mp4, m4a, wav, flac, ogg, webm, or amr.";
  }

  if (contentType && contentType !== "application/octet-stream" && !acceptedAudioContentTypes.has(contentType)) {
    return "Unsupported audio content type.";
  }

  if (typeof body.fileSizeBytes === "number" && body.fileSizeBytes > maxAudioUploadBytes) {
    return "Audio uploads are capped at 100 MB for the low-volume pilot.";
  }

  return undefined;
}
