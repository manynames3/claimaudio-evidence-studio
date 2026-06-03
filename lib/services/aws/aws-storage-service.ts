import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAwsRuntimeConfig } from "@/lib/server/env";
import type {
  CreateAudioAssetInput,
  SignedUploadUrlRequest,
  SignedUploadUrlResult,
  StorageService
} from "@/lib/services/storage-service";
import type { AudioAsset } from "@/lib/types";

export class AwsStorageService implements StorageService {
  private readonly s3Client: S3Client;

  constructor() {
    const { region } = getAwsRuntimeConfig();
    this.s3Client = new S3Client({ region });
  }

  async createSignedUploadUrl(request: SignedUploadUrlRequest): Promise<SignedUploadUrlResult> {
    const { audioBucket } = getAwsRuntimeConfig();

    if (!audioBucket) {
      throw new Error("AWS_S3_AUDIO_BUCKET is required for production upload URLs.");
    }

    const storageKey = `claims/${request.claimProjectId}/audio/${crypto.randomUUID()}-${sanitizeFileName(request.fileName)}`;
    const command = new PutObjectCommand({
      Bucket: audioBucket,
      Key: storageKey,
      ContentType: request.contentType,
      Metadata: {
        claimProjectId: request.claimProjectId
      }
      // TODO: Keep bucket default SSE-KMS enabled and add object tags for tenant/project retention and legal hold workflows.
      // TODO: For stricter production controls, return required signed upload headers and enforce them with a bucket policy.
    });

    return {
      uploadUrl: await getSignedUrl(this.s3Client, command, { expiresIn: 15 * 60 }),
      storageKey,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
  }

  async createMockAudioAsset(input: CreateAudioAssetInput): Promise<AudioAsset> {
    // TODO: Rename this interface method to createAudioAsset once the client no longer uses mock wording.
    const signedUpload = await this.createSignedUploadUrl({
      claimProjectId: input.claimProjectId,
      fileName: input.fileName,
      contentType: "audio/wav"
    });

    return {
      id: input.id,
      claimProjectId: input.claimProjectId,
      fileName: input.fileName,
      durationSeconds: input.durationSeconds || 0,
      sourceType: input.sourceType,
      processingStatus: "uploaded",
      storageUrl: signedUpload.storageKey,
      createdAt: new Date().toISOString()
    };
  }
}

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .trim()
      .replace(/[/\\]/g, "-")
      .replace(/[^a-zA-Z0-9._ -]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 120) || "recorded_statement.wav"
  );
}
