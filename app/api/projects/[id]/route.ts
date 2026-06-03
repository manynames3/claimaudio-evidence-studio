import { createClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import {
  mockAuditEvents,
  mockAudioAssets,
  mockContradictions,
  mockEvidenceClips,
  mockExportMemos,
  mockFindings,
  mockProjects,
  mockTranscriptSegments
} from "@/lib/mock-data";
import { jsonError, jsonOk, requireAuth } from "@/lib/server/api";
import { getRuntimeBackendStatus } from "@/lib/server/env";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuth(_request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await context.params;
  const status = getRuntimeBackendStatus();

  if (!status.neonConfigured) {
    const project = mockProjects.find((item) => item.id === id);

    if (!project) {
      return jsonError("Project not found.", 404);
    }

    return jsonOk({
      backend: status,
      mode: "mock-readonly",
      bundle: {
        project,
        audioAsset: mockAudioAssets.find((asset) => asset.id === project.audioAssetId),
        transcriptSegments: mockTranscriptSegments.filter((segment) => segment.audioAssetId === project.audioAssetId),
        findings: mockFindings.filter((finding) => finding.audioAssetId === project.audioAssetId),
        contradictions: mockContradictions.filter((contradiction) => contradiction.audioAssetId === project.audioAssetId),
        clips: mockEvidenceClips.filter((clip) => clip.claimProjectId === project.id),
        exportMemos: mockExportMemos.filter((memo) => memo.claimProjectId === project.id),
        auditEvents: mockAuditEvents.filter((event) => event.claimProjectId === project.id)
      }
    });
  }

  try {
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const bundle = await repository.getProjectBundle(id);

    if (!bundle) {
      return jsonError("Project not found.", 404);
    }

    return jsonOk({
      backend: status,
      mode: "neon",
      bundle
    });
  } catch (error) {
    return jsonError("Failed to load project from Neon.", 500, error instanceof Error ? error.message : error);
  }
}
