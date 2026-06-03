import type { AudioAsset } from "@/lib/types";
import { sampleStatementAudioDurationSeconds, sampleStatementAudioUrl } from "@/lib/demo-audio/sample-statement";

export interface SignedUploadUrlRequest {
  claimProjectId: string;
  fileName: string;
  contentType: string;
}

export interface SignedUploadUrlResult {
  uploadUrl: string;
  storageKey: string;
  expiresAt: string;
}

export interface CreateAudioAssetInput {
  id: string;
  claimProjectId: string;
  fileName: string;
  sourceType: AudioAsset["sourceType"];
  durationSeconds?: number;
}

export interface StorageService {
  createSignedUploadUrl(request: SignedUploadUrlRequest): Promise<SignedUploadUrlResult>;
  createMockAudioAsset(input: CreateAudioAssetInput): Promise<AudioAsset>;
}

export const mockStorageService: StorageService = {
  async createSignedUploadUrl(request) {
    // TODO: Production implementation should request a short-lived S3 signed upload URL.
    // TODO: Store encrypted objects under tenant-scoped keys with S3 SSE-KMS and KMS key policies.
    return {
      uploadUrl: `mock://signed-upload/${request.claimProjectId}/${encodeURIComponent(request.fileName)}`,
      storageKey: `claims/${request.claimProjectId}/audio/${request.fileName}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
  },
  async createMockAudioAsset(input) {
    if (input.sourceType === "sample") {
      return {
        id: input.id,
        claimProjectId: input.claimProjectId,
        fileName: input.fileName,
        durationSeconds: input.durationSeconds || sampleStatementAudioDurationSeconds,
        sourceType: input.sourceType,
        processingStatus: "uploaded",
        storageUrl: sampleStatementAudioUrl,
        createdAt: new Date().toISOString()
      };
    }

    const signedUrl = await this.createSignedUploadUrl({
      claimProjectId: input.claimProjectId,
      fileName: input.fileName,
      contentType: "audio/wav"
    });

    return {
      id: input.id,
      claimProjectId: input.claimProjectId,
      fileName: input.fileName,
      durationSeconds: input.durationSeconds || 658,
      sourceType: input.sourceType,
      processingStatus: "uploaded",
      storageUrl: signedUrl.storageKey,
      createdAt: new Date().toISOString()
    };
  }
};

export const storageService = mockStorageService;
