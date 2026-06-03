import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  GetTranscriptionJobCommand,
  LanguageCode,
  MediaFormat,
  StartTranscriptionJobCommand,
  TranscribeClient,
  TranscriptionJobStatus
} from "@aws-sdk/client-transcribe";
import { getAwsRuntimeConfig } from "@/lib/server/env";
import type { TranscriptSegment } from "@/lib/types";

export interface StartAwsTranscriptionInput {
  claimProjectId: string;
  audioAssetId: string;
  s3AudioUri: string;
  mediaFormat: MediaFormat;
  languageCode?: LanguageCode;
}

export interface StartAwsTranscriptionResult {
  transcriptionJobName: string;
  outputBucket: string;
  outputKey: string;
}

export interface AwsTranscriptionStatusResult {
  transcriptionJobName: string;
  status: TranscriptionJobStatus | "UNKNOWN";
  transcriptFileUri?: string;
  failureReason?: string;
  outputBucket?: string;
  outputKey?: string;
}

interface AwsTranscribeOutput {
  results?: {
    transcripts?: Array<{ transcript?: string }>;
    speaker_labels?: {
      segments?: Array<{
        start_time?: string;
        end_time?: string;
        speaker_label?: string;
      }>;
    };
    items?: Array<{
      type?: "pronunciation" | "punctuation";
      start_time?: string;
      end_time?: string;
      alternatives?: Array<{ content?: string; confidence?: string }>;
      speaker_label?: string;
    }>;
  };
}

type AwsTranscribeItem = NonNullable<NonNullable<AwsTranscribeOutput["results"]>["items"]>[number];

export class AwsTranscriptionService {
  private readonly transcribeClient: TranscribeClient;
  private readonly s3Client: S3Client;

  constructor() {
    const { region } = getAwsRuntimeConfig();
    this.transcribeClient = new TranscribeClient({ region });
    this.s3Client = new S3Client({ region });
  }

  async startTranscription(input: StartAwsTranscriptionInput): Promise<StartAwsTranscriptionResult> {
    const { exportBucket, kmsKeyArn } = getAwsRuntimeConfig();

    if (!exportBucket) {
      throw new Error("AWS_S3_EXPORT_BUCKET is required for Transcribe output.");
    }

    const transcriptionJobName = `claimaudio-${input.audioAssetId}`
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(0, 200);
    const outputKey = `claims/${input.claimProjectId}/transcripts/${input.audioAssetId}.json`;

    try {
      await this.transcribeClient.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: transcriptionJobName,
          Media: {
            MediaFileUri: input.s3AudioUri
          },
          MediaFormat: input.mediaFormat,
          LanguageCode: input.languageCode || LanguageCode.EN_US,
          OutputBucketName: exportBucket,
          OutputKey: outputKey,
          OutputEncryptionKMSKeyId: kmsKeyArn || undefined,
          Settings: {
            ShowSpeakerLabels: true,
            MaxSpeakerLabels: 4
          }
          // TODO: Evaluate Amazon Transcribe Call Analytics for speaker/channel separation and call summarization signals.
          // TODO: Store raw transcript JSON in encrypted S3 and normalized segments in Neon.
        })
      );
    } catch (error) {
      if (!isTranscriptionJobConflict(error)) {
        throw error;
      }

      // Existing jobs are acceptable for user-triggered retry. The polling endpoint will reconcile the result.
    }

    return { transcriptionJobName, outputBucket: exportBucket, outputKey };
  }

  async getTranscriptionStatus(transcriptionJobName: string): Promise<AwsTranscriptionStatusResult> {
    const result = await this.transcribeClient.send(
      new GetTranscriptionJobCommand({
        TranscriptionJobName: transcriptionJobName
      })
    );
    const job = result.TranscriptionJob;
    const transcriptFileUri = job?.Transcript?.TranscriptFileUri;
    const { exportBucket } = getAwsRuntimeConfig();

    return {
      transcriptionJobName,
      status: job?.TranscriptionJobStatus || "UNKNOWN",
      transcriptFileUri,
      failureReason: job?.FailureReason,
      outputBucket: exportBucket,
      outputKey: transcriptFileUri ? extractS3KeyFromUri(transcriptFileUri, exportBucket) : undefined
    };
  }

  async fetchTranscriptSegments(input: {
    audioAssetId: string;
    outputBucket: string;
    outputKey: string;
  }): Promise<TranscriptSegment[]> {
    const object = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: input.outputBucket,
        Key: input.outputKey
      })
    );
    const body = await object.Body?.transformToString();

    if (!body) {
      throw new Error("Transcribe output was empty.");
    }

    return normalizeTranscribeOutput(input.audioAssetId, JSON.parse(body) as AwsTranscribeOutput);
  }
}

export function inferMediaFormat(fileName: string): MediaFormat {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "mp3") return MediaFormat.MP3;
  if (extension === "mp4") return MediaFormat.MP4;
  if (extension === "m4a") return MediaFormat.M4A;
  if (extension === "flac") return MediaFormat.FLAC;
  if (extension === "ogg") return MediaFormat.OGG;
  if (extension === "amr") return MediaFormat.AMR;
  if (extension === "webm") return MediaFormat.WEBM;

  return MediaFormat.WAV;
}

export function getTranscriptionJobName(audioAssetId: string) {
  return `claimaudio-${audioAssetId}`.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 200);
}

function extractS3KeyFromUri(uri: string, bucket: string) {
  const marker = `/${bucket}/`;
  const markerIndex = uri.indexOf(marker);

  if (markerIndex !== -1) {
    return decodeURIComponent(uri.slice(markerIndex + marker.length));
  }

  const url = new URL(uri);
  return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
}

function normalizeTranscribeOutput(audioAssetId: string, output: AwsTranscribeOutput): TranscriptSegment[] {
  const items = output.results?.items || [];
  const speakerSegments = output.results?.speaker_labels?.segments || [];

  if (speakerSegments.length > 0) {
    return speakerSegments.map((segment, index) => {
      const start = Number(segment.start_time || 0);
      const end = Number(segment.end_time || start);
      const words = items.filter((item) => {
        if (item.type !== "pronunciation" || !item.start_time) {
          return false;
        }

        const itemStart = Number(item.start_time);
        return itemStart >= start && itemStart <= end + 0.05;
      });
      const text = buildTranscriptText(itemsForRange(items, start, end));
      const averageConfidence = words.length
        ? words.reduce((sum, word) => sum + Number(word.alternatives?.[0]?.confidence || 0), 0) / words.length
        : 0.8;

      return {
        id: `${audioAssetId}-real-seg-${String(index + 1).padStart(3, "0")}`,
        audioAssetId,
        speaker: mapSpeakerLabel(segment.speaker_label, index),
        text: text || `Speaker segment ${index + 1}`,
        startTimeSeconds: start,
        endTimeSeconds: end,
        confidence: Number.isFinite(averageConfidence) ? Math.min(1, Math.max(0, averageConfidence)) : 0.8
      };
    });
  }

  const transcript = output.results?.transcripts?.[0]?.transcript || "";

  if (items.length > 0) {
    return groupItemsIntoSegments(audioAssetId, items);
  }

  return [
    {
      id: `${audioAssetId}-real-seg-001`,
      audioAssetId,
      speaker: "Claimant",
      text: transcript || "Transcript completed, but no transcript text was returned.",
      startTimeSeconds: 0,
      endTimeSeconds: 0,
      confidence: 0.8
    }
  ];
}

function itemsForRange(items: AwsTranscribeItem[], start: number, end: number) {
  const selected: AwsTranscribeItem[] = [];
  let lastPronunciationWasSelected = false;

  for (const item of items) {
    if (item.type === "pronunciation" && item.start_time) {
      const itemStart = Number(item.start_time);
      lastPronunciationWasSelected = itemStart >= start && itemStart <= end + 0.05;

      if (lastPronunciationWasSelected) {
        selected.push(item);
      }

      continue;
    }

    if (item.type === "punctuation" && lastPronunciationWasSelected) {
      selected.push(item);
    }
  }

  return selected;
}

function buildTranscriptText(items: AwsTranscribeItem[]) {
  return items.reduce((text, item) => {
    const content = item.alternatives?.[0]?.content || "";

    if (!content) {
      return text;
    }

    if (item.type === "punctuation") {
      return `${text}${content}`;
    }

    return text ? `${text} ${content}` : content;
  }, "");
}

function groupItemsIntoSegments(
  audioAssetId: string,
  items: AwsTranscribeItem[]
): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let currentItems: AwsTranscribeItem[] = [];
  let currentStart = 0;
  let currentEnd = 0;
  let lastEnd = 0;
  let index = 0;
  let currentSpeakerLabel: string | undefined;

  const flush = () => {
    const pronunciations = currentItems.filter((item) => item.type === "pronunciation");

    if (pronunciations.length === 0) {
      currentItems = [];
      return;
    }

    const averageConfidence =
      pronunciations.reduce((sum, item) => sum + Number(item.alternatives?.[0]?.confidence || 0), 0) /
      pronunciations.length;
    index += 1;
    segments.push({
      id: `${audioAssetId}-real-seg-${String(index).padStart(3, "0")}`,
      audioAssetId,
      speaker: mapSpeakerLabel(currentSpeakerLabel, index),
      text: buildTranscriptText(currentItems),
      startTimeSeconds: currentStart,
      endTimeSeconds: currentEnd,
      confidence: Number.isFinite(averageConfidence) ? Math.min(1, Math.max(0, averageConfidence)) : 0.8
    });
    currentItems = [];
    currentSpeakerLabel = undefined;
  };

  for (const item of items) {
    if (item.type === "pronunciation" && item.start_time) {
      const start = Number(item.start_time);
      const end = Number(item.end_time || item.start_time);
      const shouldStartNewSegment =
        currentItems.length === 0 || start - lastEnd > 1.2 || currentEnd - currentStart > 18;

      if (shouldStartNewSegment && currentItems.length > 0) {
        flush();
      }

      if (currentItems.length === 0) {
        currentStart = start;
        currentSpeakerLabel = item.speaker_label;
      }

      currentEnd = end;
      lastEnd = end;
      currentItems.push(item);
      continue;
    }

    if (item.type === "punctuation" && currentItems.length > 0) {
      currentItems.push(item);
    }
  }

  flush();

  return segments;
}

function isTranscriptionJobConflict(error: unknown) {
  return error instanceof Error && error.name === "ConflictException";
}

function mapSpeakerLabel(label: string | undefined, fallbackIndex: number): TranscriptSegment["speaker"] {
  const digits = label?.match(/\d+/)?.[0];
  const speakerIndex = digits ? Number(digits) : Number.NaN;

  if (Number.isFinite(speakerIndex)) {
    if (speakerIndex === 0) return "Adjuster";
    if (speakerIndex === 1) return "Claimant";
    if (speakerIndex === 2) return "Witness";
    return "Insured";
  }

  if (fallbackIndex % 2 === 0) {
    return "Adjuster";
  }

  return "Claimant";
}
