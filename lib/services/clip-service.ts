import type { EvidenceClip } from "@/lib/types";

export interface CreateClipInput {
  claimProjectId: string;
  audioAssetId: string;
  title: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  transcriptExcerpt: string;
  linkedFindingIds: string[];
  createdBy: string;
}

export interface ClipService {
  createClip(input: CreateClipInput): Promise<EvidenceClip>;
}

export const mockClipService: ClipService = {
  async createClip(input) {
    // TODO: Production implementation should clip source audio from encrypted S3 storage.
    // TODO: Use FFmpeg, MediaConvert, or containerized media processing and return a signed download URL.
    return {
      id: `clip-${crypto.randomUUID()}`,
      audioAssetId: input.audioAssetId,
      claimProjectId: input.claimProjectId,
      title: input.title,
      startTimeSeconds: input.startTimeSeconds,
      endTimeSeconds: input.endTimeSeconds,
      transcriptExcerpt: input.transcriptExcerpt,
      linkedFindingIds: input.linkedFindingIds,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString()
    };
  }
};

export const clipService = mockClipService;
