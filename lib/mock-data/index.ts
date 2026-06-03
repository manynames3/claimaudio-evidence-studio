import {
  pollyDemoAudioDurationSeconds,
  pollyDemoAudioUrl,
  pollyDemoContradictions,
  pollyDemoEvidenceClips,
  pollyDemoExportMemos,
  pollyDemoFindings,
  pollyDemoTranscriptSegments
} from "@/lib/mock-data/polly-demo-statement";
import type {
  AuditLogEvent,
  AudioAsset,
  ClaimProject,
  Contradiction,
  EvidenceClip,
  EvidenceFinding,
  ExportMemo,
  TranscriptSegment
} from "@/lib/types";

export const evidenceCategories = [
  "Liability",
  "Injury",
  "Damages",
  "Prior Condition",
  "Timeline",
  "Coverage",
  "Credibility",
  "SIU Flag",
  "Follow-up"
] as const;

export const mockProjects: ClaimProject[] = [
  {
    id: "claim-7842",
    claimNumber: "AUTO-BI-7842",
    claimantName: "Maria Santos",
    insuredName: "Evan Brooks",
    lossDate: "2026-05-14",
    claimType: "Auto bodily injury",
    lineOfBusiness: "Personal Auto",
    status: "reviewing",
    audioAssetId: "audio-7842-statement",
    reviewFlags: {
      readyForReview: true,
      needsSupervisorReview: true,
      siuFlagged: true,
      draftMemoReady: true
    },
    createdAt: "2026-05-16T13:20:00.000Z",
    updatedAt: "2026-06-03T08:10:00.000Z"
  },
  {
    id: "claim-1299",
    claimNumber: "AUTO-LIAB-1299",
    claimantName: "Brandon Lee",
    insuredName: "Northstar Delivery LLC",
    lossDate: "2026-05-22",
    claimType: "Auto liability",
    lineOfBusiness: "Commercial Auto",
    status: "ready",
    audioAssetId: "audio-1299-statement",
    reviewFlags: {
      readyForReview: true,
      needsSupervisorReview: false,
      siuFlagged: false,
      draftMemoReady: false
    },
    createdAt: "2026-05-23T11:12:00.000Z",
    updatedAt: "2026-05-29T15:45:00.000Z"
  },
  {
    id: "claim-4410",
    claimNumber: "AUTO-UM-4410",
    claimantName: "Denise Carter",
    insuredName: "Denise Carter",
    lossDate: "2026-05-05",
    claimType: "UM/UIM bodily injury",
    lineOfBusiness: "Personal Auto",
    status: "draft",
    audioAssetId: "audio-4410-statement",
    reviewFlags: {
      readyForReview: false,
      needsSupervisorReview: false,
      siuFlagged: false,
      draftMemoReady: true
    },
    createdAt: "2026-05-06T09:18:00.000Z",
    updatedAt: "2026-05-28T19:10:00.000Z"
  }
];

export const mockAudioAssets: AudioAsset[] = [
  {
    id: "audio-7842-statement",
    claimProjectId: "claim-7842",
    fileName: "Santos_recorded_statement_polly_demo.wav",
    durationSeconds: pollyDemoAudioDurationSeconds,
    sourceType: "sample",
    processingStatus: "readyForReview",
    storageUrl: pollyDemoAudioUrl,
    createdAt: "2026-05-16T13:24:00.000Z"
  },
  {
    id: "audio-1299-statement",
    claimProjectId: "claim-1299",
    fileName: "Lee_delivery_loss_statement.mp3",
    durationSeconds: 482,
    sourceType: "sample",
    processingStatus: "readyForReview",
    createdAt: "2026-05-23T11:26:00.000Z"
  },
  {
    id: "audio-4410-statement",
    claimProjectId: "claim-4410",
    fileName: "Carter_UM_recording_pending_review.m4a",
    durationSeconds: 536,
    sourceType: "sample",
    processingStatus: "analyzing",
    createdAt: "2026-05-06T09:29:00.000Z"
  }
];

export const mockTranscriptSegments: TranscriptSegment[] = pollyDemoTranscriptSegments;
export const mockFindings: EvidenceFinding[] = pollyDemoFindings;
export const mockContradictions: Contradiction[] = pollyDemoContradictions;
export const mockEvidenceClips: EvidenceClip[] = pollyDemoEvidenceClips;
export const mockExportMemos: ExportMemo[] = pollyDemoExportMemos;

export const mockAuditEvents: AuditLogEvent[] = [
  {
    id: "audit-seed-001",
    claimProjectId: "claim-7842",
    audioAssetId: "audio-7842-statement",
    eventType: "projectCreated",
    actor: "Demo Reviewer",
    targetType: "project",
    targetId: "claim-7842",
    summary: "Project AUTO-BI-7842 created for recorded statement review.",
    createdAt: "2026-06-02T13:00:00.000Z"
  },
  {
    id: "audit-seed-002",
    claimProjectId: "claim-7842",
    audioAssetId: "audio-7842-statement",
    eventType: "audioUploaded",
    actor: "Demo Reviewer",
    targetType: "audio",
    targetId: "audio-7842-statement",
    summary: "Amazon Polly sample recorded statement attached to the demo claim.",
    metadata: {
      sourceType: "sample",
      playbackUrl: pollyDemoAudioUrl,
      generatedAudio: true
    },
    createdAt: "2026-06-02T13:02:00.000Z"
  },
  {
    id: "audit-seed-003",
    claimProjectId: "claim-7842",
    audioAssetId: "audio-7842-statement",
    eventType: "transcriptionCompleted",
    actor: "System",
    targetType: "transcript",
    targetId: "audio-7842-statement",
    summary: `Mock transcription completed with ${pollyDemoTranscriptSegments.length} timestamped transcript segments.`,
    metadata: {
      timingSource: "Amazon Polly synthesis line timings"
    },
    createdAt: "2026-06-02T13:04:00.000Z"
  },
  {
    id: "audit-seed-004",
    claimProjectId: "claim-7842",
    audioAssetId: "audio-7842-statement",
    eventType: "analysisCompleted",
    actor: "System",
    targetType: "analysis",
    targetId: "audio-7842-statement",
    summary: "Mock evidence analysis completed with 12 findings and 3 contradictions.",
    createdAt: "2026-06-02T13:06:00.000Z"
  }
];
