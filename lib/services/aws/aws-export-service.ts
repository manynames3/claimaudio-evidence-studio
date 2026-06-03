import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAwsRuntimeConfig } from "@/lib/server/env";
import type { GeneratedExport } from "@/lib/types";

export interface StoreExportArtifactInput {
  claimProjectId: string;
  generatedExport: GeneratedExport;
  contentType?: string;
}

export interface StoreExportArtifactResult {
  storageKey: string;
  downloadUrl: string;
  expiresAt: string;
}

export interface SignedExportDownloadUrlResult {
  downloadUrl: string;
  expiresAt: string;
}

export class AwsExportArtifactService {
  private readonly s3Client: S3Client;

  constructor() {
    const { region } = getAwsRuntimeConfig();
    this.s3Client = new S3Client({ region });
  }

  async storeExportArtifact(input: StoreExportArtifactInput): Promise<StoreExportArtifactResult> {
    const { exportBucket, kmsKeyArn } = getAwsRuntimeConfig();

    if (!exportBucket) {
      throw new Error("AWS_S3_EXPORT_BUCKET is required for production export storage.");
    }

    const storageKey = `claims/${input.claimProjectId}/exports/${crypto.randomUUID()}-${input.generatedExport.fileName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: exportBucket,
        Key: storageKey,
        Body: input.generatedExport.content,
        ContentType: input.contentType || inferContentType(input.generatedExport.fileName),
        ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: kmsKeyArn || undefined
        // TODO: Add object retention tags and legal-hold controls for claim-file exports.
      })
    );

    return {
      storageKey,
      ...(await this.createSignedDownloadUrl(storageKey))
    };
  }

  async createSignedDownloadUrl(storageKey: string): Promise<SignedExportDownloadUrlResult> {
    const { exportBucket } = getAwsRuntimeConfig();

    if (!exportBucket) {
      throw new Error("AWS_S3_EXPORT_BUCKET is required for production export downloads.");
    }

    const command = new GetObjectCommand({
      Bucket: exportBucket,
      Key: storageKey
    });

    return {
      downloadUrl: await getSignedUrl(this.s3Client, command, { expiresIn: 15 * 60 }),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
  }
}

function inferContentType(fileName: string) {
  if (fileName.endsWith(".html")) {
    return "text/html";
  }

  if (fileName.endsWith(".json")) {
    return "application/json";
  }

  return "text/plain";
}
