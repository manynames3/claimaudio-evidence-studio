import { mockTranscriptSegments } from "@/lib/mock-data";
import type { TranscriptSegment } from "@/lib/types";

export interface TranscriptionInput {
  sourceAudioAssetId: string;
  targetAudioAssetId: string;
  claimNumber?: string;
  claimantName?: string;
  insuredName?: string;
}

export interface TranscriptionResult {
  transcriptSegments: TranscriptSegment[];
  engine: "mock" | "amazon-transcribe" | "transcribe-call-analytics";
}

export interface TranscriptionService {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export const mockTranscriptionService: TranscriptionService = {
  async transcribe(input) {
    // TODO: Production implementation should start Amazon Transcribe or Transcribe Call Analytics.
    // TODO: Persist speaker diarization, word/segment timestamps, and confidence scores in RDS Postgres.
    // TODO: Dispatch and monitor work through SQS and Step Functions instead of in-browser timers.
    const transcriptSegments = mockTranscriptSegments
      .filter((segment) => segment.audioAssetId === input.sourceAudioAssetId)
      .map((segment) => ({
        ...segment,
        id: `${input.targetAudioAssetId}-${segment.id}`,
        audioAssetId: input.targetAudioAssetId,
        text: segment.text
          .replaceAll("AUTO-BI-7842", input.claimNumber || "AUTO-BI-7842")
          .replaceAll("Maria Santos", input.claimantName || "Maria Santos")
          .replaceAll("Evan Brooks", input.insuredName || "Evan Brooks")
      }));

    return {
      transcriptSegments,
      engine: "mock"
    };
  }
};

export const transcriptionService = mockTranscriptionService;
