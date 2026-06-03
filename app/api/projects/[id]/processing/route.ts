import { createClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import { analysisService, transcriptionService } from "@/lib/services";
import {
  AwsAnalysisService,
  AwsTranscriptionService,
  getTranscriptionJobName,
  inferMediaFormat
} from "@/lib/services/aws";
import { assertNeonConfigured, jsonError, jsonOk, requireAuth } from "@/lib/server/api";
import { writableRoles } from "@/lib/server/auth";
import { getAwsRuntimeConfig, getRuntimeBackendStatus } from "@/lib/server/env";
import type { ClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import type { AudioAsset, ClaimProject, Contradiction, EvidenceFinding, Severity, TranscriptSegment } from "@/lib/types";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const sourceAudioAssetId = "audio-7842-statement";
const nowIso = () => new Date().toISOString();

export async function POST(_request: Request, context: RouteContext) {
  const authResult = await requireAuth(_request, writableRoles);

  if (!authResult.ok) {
    return authResult.response;
  }

  const configurationError = assertNeonConfigured();

  if (configurationError) {
    return configurationError;
  }

  try {
    const { id } = await context.params;
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const bundle = await repository.getProjectBundle(id);

    if (!bundle?.audioAsset) {
      return jsonError("Project or audio asset not found.", 404);
    }

    const { project, audioAsset } = bundle;

    if (audioAsset.sourceType === "uploaded") {
      if (audioAsset.processingStatus === "readyForReview") {
        return jsonOk({
          status: "readyForReview",
          transcriptSegments: bundle.transcriptSegments.length,
          findings: bundle.findings.length,
          contradictions: bundle.contradictions.length,
          message: "This uploaded statement is already ready for review."
        });
      }

      if (audioAsset.processingStatus === "transcribing") {
        return jsonOk({
          status: "transcribing",
          transcriptionJobName: getTranscriptionJobName(audioAsset.id),
          message: "Amazon Transcribe job is already running. Use GET on this endpoint to refresh status."
        });
      }

      const backendStatus = getRuntimeBackendStatus();

      if (!backendStatus.awsConfigured) {
        return jsonError("AWS is not configured for real audio transcription.", 503, {
          missingEnv: backendStatus.missingAwsEnv
        });
      }

      if (!audioAsset.storageUrl) {
        return jsonError("Uploaded audio is missing an S3 storage key.", 400);
      }

      const awsTranscriptionService = new AwsTranscriptionService();
      const { audioBucket } = getAwsRuntimeConfig();
      const transcription = await awsTranscriptionService.startTranscription({
        claimProjectId: project.id,
        audioAssetId: audioAsset.id,
        s3AudioUri: `s3://${audioBucket}/${audioAsset.storageUrl}`,
        mediaFormat: inferMediaFormat(audioAsset.fileName)
      });

      await repository.updateProjectProcessingStatus(project.id, audioAsset.id, "transcribing", "transcribing");
      await repository.recordAuditEvent({
        id: `audit-${crypto.randomUUID()}`,
        claimProjectId: project.id,
        audioAssetId: audioAsset.id,
        eventType: "transcriptionStarted",
        actor: "System",
        targetType: "audio",
        targetId: audioAsset.id,
        summary: `Started Amazon Transcribe job ${transcription.transcriptionJobName}.`,
        metadata: {
          transcriptionJobName: transcription.transcriptionJobName,
          outputBucket: transcription.outputBucket,
          outputKey: transcription.outputKey,
          requestedBy: authResult.auth.userId
        },
        createdAt: nowIso()
      });

      return jsonOk({
        status: "transcribing",
        transcriptionJobName: transcription.transcriptionJobName,
        message: "Amazon Transcribe job started. Use GET on this endpoint to refresh status."
      });
    }

    // TODO: Production AWS path should enqueue SQS and start Step Functions here.
    // TODO: Step Functions should call Amazon Transcribe/Call Analytics, Bedrock analysis, validation, persistence, and retry handlers.
    await repository.updateProjectProcessingStatus(project.id, audioAsset.id, "transcribing", "transcribing");
    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: project.id,
      audioAssetId: audioAsset.id,
      eventType: "transcriptionStarted",
      actor: "System",
      targetType: "transcript",
      targetId: audioAsset.id,
      summary: "Mock transcription job started.",
      metadata: {
        requestedBy: authResult.auth.userId
      },
      createdAt: nowIso()
    });

    const transcription = await transcriptionService.transcribe({
      sourceAudioAssetId,
      targetAudioAssetId: audioAsset.id,
      claimNumber: project.claimNumber,
      claimantName: project.claimantName,
      insuredName: project.insuredName
    });
    const transcriptSegmentIdMap = new Map(
      transcription.transcriptSegments.map((segment) => [
        segment.id.replace(`${audioAsset.id}-`, ""),
        segment.id
      ])
    );

    await repository.saveTranscriptSegments(transcription.transcriptSegments);
    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: project.id,
      audioAssetId: audioAsset.id,
      eventType: "transcriptionCompleted",
      actor: "System",
      targetType: "transcript",
      targetId: audioAsset.id,
      summary: `Transcription completed with ${transcription.transcriptSegments.length} timestamped segments.`,
      metadata: { engine: transcription.engine },
      createdAt: nowIso()
    });

    await repository.updateProjectProcessingStatus(project.id, audioAsset.id, "analyzing", "analyzing");
    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: project.id,
      audioAssetId: audioAsset.id,
      eventType: "analysisStarted",
      actor: "System",
      targetType: "analysis",
      targetId: audioAsset.id,
      summary: "Evidence extraction and contradiction analysis started.",
      metadata: {
        requestedBy: authResult.auth.userId
      },
      createdAt: nowIso()
    });

    const analysis = await analysisService.analyze({
      claimProjectId: project.id,
      sourceAudioAssetId,
      targetAudioAssetId: audioAsset.id,
      claimNumber: project.claimNumber,
      claimantName: project.claimantName,
      transcriptSegmentIdMap
    });

    await repository.saveAnalysisResult(analysis);
    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: project.id,
      audioAssetId: audioAsset.id,
      eventType: "analysisCompleted",
      actor: "System",
      targetType: "analysis",
      targetId: audioAsset.id,
      summary: `Analysis completed with ${analysis.findings.length} evidence findings and ${analysis.contradictions.length} contradictions.`,
      metadata: { modelProvider: analysis.modelProvider },
      createdAt: nowIso()
    });

    await repository.updateProjectProcessingStatus(project.id, audioAsset.id, "ready", "readyForReview");
    await repository.markProjectReadyForReview(project.id);

    return jsonOk({
      status: "readyForReview",
      transcriptSegments: transcription.transcriptSegments.length,
      findings: analysis.findings.length,
      contradictions: analysis.contradictions.length,
      clips: analysis.clips.length,
      exportMemos: analysis.exportMemos.length
    });
  } catch (error) {
    return jsonError("Failed to run server-side processing.", 500, error instanceof Error ? error.message : error);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireAuth(_request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const configurationError = assertNeonConfigured();

  if (configurationError) {
    return configurationError;
  }

  try {
    const { id } = await context.params;
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const bundle = await repository.getProjectBundle(id);

    if (!bundle?.audioAsset) {
      return jsonError("Project or audio asset not found.", 404);
    }

    const { project, audioAsset } = bundle;

    if (audioAsset.sourceType !== "uploaded") {
      return jsonOk({
        status: audioAsset.processingStatus,
        message: "Sample statement processing uses the local mock analysis path."
      });
    }

    if (audioAsset.processingStatus === "readyForReview" && bundle.transcriptSegments.length > 0) {
      return jsonOk({
        status: "readyForReview",
        transcriptionJobName: getTranscriptionJobName(audioAsset.id),
        transcriptSegments: bundle.transcriptSegments.length,
        findings: bundle.findings.length,
        contradictions: bundle.contradictions.length,
        message: "Transcript and evidence review data are already persisted."
      });
    }

    const backendStatus = getRuntimeBackendStatus();

    if (!backendStatus.awsConfigured) {
      return jsonError("AWS is not configured for real audio transcription.", 503, {
        missingEnv: backendStatus.missingAwsEnv
      });
    }

    const awsTranscriptionService = new AwsTranscriptionService();
    const transcriptionJobName = getTranscriptionJobName(audioAsset.id);
    const status = await awsTranscriptionService.getTranscriptionStatus(transcriptionJobName);

    if (status.status === "QUEUED" || status.status === "IN_PROGRESS") {
      await repository.updateProjectProcessingStatus(project.id, audioAsset.id, "transcribing", "transcribing");

      return jsonOk({
        status: "transcribing",
        transcriptionJobName,
        transcribeStatus: status.status,
        message: "Amazon Transcribe is still processing this recording."
      });
    }

    if (status.status === "FAILED") {
      await repository.updateProjectProcessingStatus(project.id, audioAsset.id, "failed", "failed");

      return jsonOk({
        status: "failed",
        transcriptionJobName,
        transcribeStatus: status.status,
        error: status.failureReason || "Amazon Transcribe job failed."
      });
    }

    if (status.status !== "COMPLETED" || !status.outputBucket || !status.outputKey) {
      return jsonOk({
        status: "transcribing",
        transcriptionJobName,
        transcribeStatus: status.status,
        message: "Waiting for transcript output location."
      });
    }

    const transcriptSegments = await awsTranscriptionService.fetchTranscriptSegments({
      audioAssetId: audioAsset.id,
      outputBucket: status.outputBucket,
      outputKey: status.outputKey
    });

    await repository.saveTranscriptSegments(transcriptSegments);
    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: project.id,
      audioAssetId: audioAsset.id,
      eventType: "transcriptionCompleted",
      actor: "System",
      targetType: "transcript",
      targetId: audioAsset.id,
      summary: `Amazon Transcribe completed with ${transcriptSegments.length} timestamped segments.`,
      metadata: {
        transcriptionJobName,
        outputBucket: status.outputBucket,
        outputKey: status.outputKey
      },
      createdAt: nowIso()
    });

    const analysisSummary = await runOptionalBedrockAnalysis({
      repository,
      project,
      audioAsset,
      transcriptSegments
    });

    await repository.updateProjectProcessingStatus(project.id, audioAsset.id, "ready", "readyForReview");
    await repository.markProjectReadyForReview(project.id);

    return jsonOk({
      status: "readyForReview",
      transcriptionJobName,
      transcribeStatus: status.status,
      transcriptSegments: transcriptSegments.length,
      findings: analysisSummary.findings,
      contradictions: analysisSummary.contradictions,
      message: analysisSummary.message
    });
  } catch (error) {
    return jsonError("Failed to refresh processing status.", 500, error instanceof Error ? error.message : error);
  }
}

async function runOptionalBedrockAnalysis(input: {
  repository: ClaimAudioRepository;
  project: ClaimProject;
  audioAsset: AudioAsset;
  transcriptSegments: TranscriptSegment[];
}) {
  const { repository, project, audioAsset, transcriptSegments } = input;

  if (transcriptSegments.length === 0) {
    return {
      findings: 0,
      contradictions: 0,
      message: "Real transcript is ready for review. No transcript segments were available for AI evidence extraction."
    };
  }

  await repository.updateProjectProcessingStatus(project.id, audioAsset.id, "analyzing", "analyzing");

  try {
    const awsAnalysisService = new AwsAnalysisService();
    const extraction = await awsAnalysisService.extractEvidence({
      claimContext: {
        claimNumber: project.claimNumber,
        claimType: project.claimType,
        lineOfBusiness: project.lineOfBusiness,
        claimantName: project.claimantName,
        insuredName: project.insuredName,
        lossDate: project.lossDate
      },
      transcriptSegments: transcriptSegments.map((segment) => ({
        id: segment.id,
        speaker: segment.speaker,
        text: segment.text,
        startTimeSeconds: segment.startTimeSeconds,
        endTimeSeconds: segment.endTimeSeconds
      }))
    });
    const findings = extraction.findings
      .map((candidate, index) => toEvidenceFinding(candidate, audioAsset.id, index))
      .filter((finding) => hasQuoteSupport(finding, transcriptSegments));
    const contradictionDetection = await awsAnalysisService.detectContradictions({
      claimContext: {
        claimNumber: project.claimNumber,
        claimType: project.claimType,
        lineOfBusiness: project.lineOfBusiness,
        claimantName: project.claimantName,
        insuredName: project.insuredName,
        lossDate: project.lossDate
      },
      currentStatementSegments: transcriptSegments.map((segment) => ({
        id: segment.id,
        speaker: segment.speaker,
        text: segment.text,
        startTimeSeconds: segment.startTimeSeconds,
        endTimeSeconds: segment.endTimeSeconds
      }))
    });
    const contradictions = contradictionDetection.contradictions
      .map((candidate, index) => toContradiction(candidate, audioAsset.id, index))
      .filter((contradiction) => hasContradictionQuoteSupport(contradiction, transcriptSegments));

    await repository.saveAnalysisResult({
      findings,
      contradictions,
      clips: [],
      exportMemos: []
    });
    await repository.recordAuditEvent({
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: project.id,
      audioAssetId: audioAsset.id,
      eventType: "analysisCompleted",
      actor: "System",
      targetType: "analysis",
      targetId: audioAsset.id,
      summary: `Bedrock evidence extraction completed with ${findings.length} quote-supported findings and ${contradictions.length} contradiction pairs.`,
      metadata: {
        modelProvider: "amazon-bedrock",
        rawFindingCount: extraction.findings.length,
        persistedFindingCount: findings.length,
        rawContradictionCount: contradictionDetection.contradictions.length,
        persistedContradictionCount: contradictions.length
      },
      createdAt: nowIso()
    });

    return {
      findings: findings.length,
      contradictions: contradictions.length,
      message:
        findings.length > 0 || contradictions.length > 0
          ? "Real transcript, Bedrock evidence findings, and contradiction pairs are ready for human review."
          : "Real transcript is ready for review. Bedrock returned no quote-supported findings or contradiction pairs."
    };
  } catch (error) {
    return {
      findings: 0,
      contradictions: 0,
      message: `Real transcript is ready for review. Bedrock evidence extraction did not complete: ${
        error instanceof Error ? error.message : "Unknown analysis error"
      }`
    };
  }
}

function toContradiction(
  candidate: Awaited<ReturnType<AwsAnalysisService["detectContradictions"]>>["contradictions"][number],
  audioAssetId: string,
  index: number
): Contradiction {
  return {
    id: `${audioAssetId}-bedrock-contradiction-${String(index + 1).padStart(3, "0")}`,
    audioAssetId,
    title: candidate.title?.trim() || "Potential inconsistency requires review",
    statementA: candidate.statementA?.trim() || "First statement requires review.",
    statementB: candidate.statementB?.trim() || "Second statement requires review.",
    quoteA: candidate.quoteA?.trim() || "",
    quoteB: candidate.quoteB?.trim() || "",
    timestampA: Number(candidate.timestampA || 0),
    timestampB: Number(candidate.timestampB || 0),
    whyItMatters: candidate.whyItMatters?.trim() || "Requires human review before claim-file reliance.",
    reviewStatus: "pending"
  };
}

function toEvidenceFinding(
  candidate: Awaited<ReturnType<AwsAnalysisService["extractEvidence"]>>["findings"][number],
  audioAssetId: string,
  index: number
): EvidenceFinding {
  return {
    id: `${audioAssetId}-bedrock-finding-${String(index + 1).padStart(3, "0")}`,
    audioAssetId,
    category: candidate.category || "Follow-up",
    title: candidate.title?.trim() || candidate.category || "Claim evidence item",
    speaker: candidate.speaker?.trim() || "Unknown",
    exactQuote: candidate.exactQuote?.trim() || "",
    startTimeSeconds: Number(candidate.startTimeSeconds || 0),
    endTimeSeconds: Number(candidate.endTimeSeconds || candidate.startTimeSeconds || 0),
    confidence: clampConfidence(candidate.confidence),
    severity: normalizeSeverity(candidate.severity),
    whyItMatters: candidate.whyItMatters?.trim() || "Requires human review before claim-file reliance.",
    recommendedFollowUp:
      candidate.recommendedFollowUp?.trim() || "Human reviewer should verify this evidence item against the recording.",
    relatedTranscriptSegmentIds: candidate.relatedTranscriptSegmentIds || [],
    reviewStatus: "pending",
    notes: ""
  };
}

function hasQuoteSupport(finding: EvidenceFinding, transcriptSegments: TranscriptSegment[]) {
  const relatedSegments = transcriptSegments.filter(
    (segment) =>
      finding.relatedTranscriptSegmentIds.includes(segment.id) ||
      (segment.startTimeSeconds <= finding.endTimeSeconds && segment.endTimeSeconds >= finding.startTimeSeconds)
  );
  const relatedText = relatedSegments.map((segment) => segment.text).join(" ");
  const normalizedQuote = normalizeText(finding.exactQuote);

  return Boolean(normalizedQuote) && normalizeText(relatedText).includes(normalizedQuote);
}

function hasContradictionQuoteSupport(contradiction: Contradiction, transcriptSegments: TranscriptSegment[]) {
  return (
    hasQuoteNearTimestamp(contradiction.quoteA, contradiction.timestampA, transcriptSegments) &&
    hasQuoteNearTimestamp(contradiction.quoteB, contradiction.timestampB, transcriptSegments)
  );
}

function hasQuoteNearTimestamp(quote: string, timestamp: number, transcriptSegments: TranscriptSegment[]) {
  const nearbyText = transcriptSegments
    .filter(
      (segment) =>
        segment.startTimeSeconds <= timestamp + 12 &&
        segment.endTimeSeconds >= Math.max(0, timestamp - 12)
    )
    .map((segment) => segment.text)
    .join(" ");

  return Boolean(normalizeText(quote)) && normalizeText(nearbyText).includes(normalizeText(quote));
}

function normalizeSeverity(value: unknown): Severity {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "medium";
}

function clampConfidence(value: unknown) {
  const confidence = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(confidence)) {
    return 0.7;
  }

  return Math.min(1, Math.max(0, confidence));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
