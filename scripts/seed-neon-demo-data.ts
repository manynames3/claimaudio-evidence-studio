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
import { loadLocalEnvFile } from "./load-local-env";

async function main() {
  await loadLocalEnvFile();

  const repository = createClaimAudioRepository();

  await repository.ensureDemoTenant();

  for (const project of mockProjects) {
    const audioAsset = mockAudioAssets.find((asset) => asset.id === project.audioAssetId);

    if (!audioAsset) {
      throw new Error(`Missing audio asset for project ${project.id}`);
    }

    await repository.createProjectWithAudioAsset(project, audioAsset);
    await repository.saveTranscriptSegments(
      mockTranscriptSegments.filter((segment) => segment.audioAssetId === audioAsset.id)
    );
    await repository.saveAnalysisResult({
      findings: mockFindings.filter((finding) => finding.audioAssetId === audioAsset.id),
      contradictions: mockContradictions.filter((contradiction) => contradiction.audioAssetId === audioAsset.id),
      clips: mockEvidenceClips.filter((clip) => clip.audioAssetId === audioAsset.id),
      exportMemos: mockExportMemos.filter((memo) => memo.audioAssetId === audioAsset.id)
    });
  }

  for (const event of mockAuditEvents) {
    await repository.recordAuditEvent(event);
  }

  console.log(`Seeded ${mockProjects.length} claim project(s), ${mockFindings.length} findings, and ${mockAuditEvents.length} audit event(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
