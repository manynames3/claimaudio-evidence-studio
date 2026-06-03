import { mockContradictions, mockEvidenceClips, mockExportMemos, mockFindings } from "@/lib/mock-data";
import { buildContradictionDetectionPrompt, buildEvidenceExtractionPrompt } from "@/lib/ai/prompts";
import { assertValidEvidenceFindings } from "@/lib/ai/validation";
import type { Contradiction, EvidenceClip, EvidenceFinding, ExportMemo } from "@/lib/types";

export interface AnalysisInput {
  claimProjectId: string;
  sourceAudioAssetId: string;
  targetAudioAssetId: string;
  claimNumber: string;
  claimantName: string;
  transcriptSegmentIdMap: Map<string, string>;
}

export interface AnalysisResult {
  findings: EvidenceFinding[];
  contradictions: Contradiction[];
  clips: EvidenceClip[];
  exportMemos: ExportMemo[];
  modelProvider: "mock" | "amazon-bedrock";
}

export interface AnalysisService {
  analyze(input: AnalysisInput): Promise<AnalysisResult>;
}

export const mockAnalysisService: AnalysisService = {
  async analyze(input) {
    // TODO: Production implementation should call Amazon Bedrock with structured JSON output.
    // TODO: Use buildEvidenceExtractionPrompt and buildContradictionDetectionPrompt for Bedrock/OpenAI-compatible model requests.
    // TODO: Validate every evidence finding against transcript text before persisting or rendering it.
    // TODO: Use Step Functions to orchestrate extraction, quote validation, contradiction detection, and retries.
    // TODO: Optionally index transcript segments/findings in OpenSearch or vector search for professional search workflows.
    const findingIdMap = new Map(
      mockFindings
        .filter((finding) => finding.audioAssetId === input.sourceAudioAssetId)
        .map((finding) => [finding.id, `${input.targetAudioAssetId}-${finding.id}`])
    );

    void buildEvidenceExtractionPrompt({
      claimContext: {
        claimNumber: input.claimNumber,
        claimantName: input.claimantName
      },
      transcriptSegments: []
    });
    void buildContradictionDetectionPrompt({
      claimContext: {
        claimNumber: input.claimNumber,
        claimantName: input.claimantName
      },
      currentStatementSegments: []
    });

    const findings = mockFindings
      .filter((finding) => finding.audioAssetId === input.sourceAudioAssetId)
      .map((finding) => ({
        ...finding,
        id: findingIdMap.get(finding.id) || `${input.targetAudioAssetId}-${finding.id}`,
        audioAssetId: input.targetAudioAssetId,
        reviewStatus: "pending" as const,
        notes: "",
        relatedTranscriptSegmentIds: finding.relatedTranscriptSegmentIds.map(
          (segmentId) => input.transcriptSegmentIdMap.get(segmentId) || segmentId
        )
      }));

    assertValidEvidenceFindings(findings);

    const contradictions = mockContradictions
      .filter((contradiction) => contradiction.audioAssetId === input.sourceAudioAssetId)
      .map((contradiction) => ({
        ...contradiction,
        id: `${input.targetAudioAssetId}-${contradiction.id}`,
        audioAssetId: input.targetAudioAssetId,
        reviewStatus: "pending" as const
      }));

    const clips = mockEvidenceClips
      .filter((clip) => clip.audioAssetId === input.sourceAudioAssetId)
      .map((clip) => ({
        ...clip,
        id: `${input.targetAudioAssetId}-${clip.id}`,
        audioAssetId: input.targetAudioAssetId,
        claimProjectId: input.claimProjectId,
        linkedFindingIds: clip.linkedFindingIds.map((findingId) => findingIdMap.get(findingId) || findingId),
        createdAt: new Date().toISOString()
      }));

    const exportMemos = mockExportMemos
      .filter((memo) => memo.audioAssetId === input.sourceAudioAssetId)
      .map((memo) => ({
        ...memo,
        id: `${input.targetAudioAssetId}-${memo.id}`,
        claimProjectId: input.claimProjectId,
        audioAssetId: input.targetAudioAssetId,
        title: memo.title.replace("AUTO-BI-7842", input.claimNumber),
        content: memo.content
          .replaceAll("AUTO-BI-7842", input.claimNumber)
          .replaceAll("Maria Santos", input.claimantName),
        includedFindingIds: memo.includedFindingIds.map((findingId) => findingIdMap.get(findingId) || findingId),
        includedClipIds: clips.map((clip) => clip.id),
        includedContradictionIds: contradictions.map((contradiction) => contradiction.id),
        createdAt: new Date().toISOString()
      }));

    return {
      findings,
      contradictions,
      clips,
      exportMemos,
      modelProvider: "mock"
    };
  }
};

export const analysisService = mockAnalysisService;
