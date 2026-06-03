export type ProcessingStatus =
  | "uploaded"
  | "transcribing"
  | "analyzing"
  | "readyForReview"
  | "failed";

export type ClaimProjectStatus =
  | "uploaded"
  | "transcribing"
  | "analyzing"
  | "ready"
  | "reviewing"
  | "needsSupervisorReview"
  | "draft"
  | "failed";

export type ReviewStatus = "pending" | "approved" | "rejected" | "edited";

export type UserRole =
  | "adjuster"
  | "supervisor"
  | "siu"
  | "defense_paralegal"
  | "defense_attorney"
  | "admin";

export type EvidenceCategory =
  | "Liability"
  | "Injury"
  | "Damages"
  | "Prior Condition"
  | "Timeline"
  | "Coverage"
  | "Credibility"
  | "SIU Flag"
  | "Follow-up";

export type Severity = "low" | "medium" | "high";

export interface ClaimProject {
  id: string;
  claimNumber: string;
  claimantName: string;
  insuredName: string;
  lossDate: string;
  claimType: string;
  lineOfBusiness: string;
  status: ClaimProjectStatus;
  audioAssetId: string;
  reviewFlags: {
    readyForReview: boolean;
    needsSupervisorReview: boolean;
    siuFlagged: boolean;
    draftMemoReady: boolean;
    supervisorApproved?: boolean;
    supervisorReturned?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AudioAsset {
  id: string;
  claimProjectId: string;
  fileName: string;
  durationSeconds: number;
  sourceType: "uploaded" | "sample";
  processingStatus: ProcessingStatus;
  storageUrl?: string;
  createdAt: string;
}

export interface TranscriptSegment {
  id: string;
  audioAssetId: string;
  speaker: "Adjuster" | "Claimant" | "Insured" | "Witness";
  text: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  confidence: number;
}

export interface EvidenceFinding {
  id: string;
  audioAssetId: string;
  category: EvidenceCategory;
  title: string;
  speaker: string;
  exactQuote: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  confidence: number;
  severity: Severity;
  whyItMatters: string;
  recommendedFollowUp: string;
  relatedTranscriptSegmentIds: string[];
  reviewStatus: ReviewStatus;
  notes: string;
}

export interface Contradiction {
  id: string;
  audioAssetId: string;
  title: string;
  statementA: string;
  statementB: string;
  quoteA: string;
  quoteB: string;
  timestampA: number;
  timestampB: number;
  whyItMatters: string;
  reviewStatus: ReviewStatus;
}

export interface EvidenceClip {
  id: string;
  audioAssetId: string;
  claimProjectId: string;
  title: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  transcriptExcerpt: string;
  linkedFindingIds: string[];
  createdBy: string;
  createdAt: string;
}

export interface ExportMemo {
  id: string;
  claimProjectId: string;
  audioAssetId: string;
  exportType:
    | "statementSummary"
    | "timestampedEvidenceMemo"
    | "contradictionReport"
    | "transcript"
    | "supervisorReviewPacket";
  title: string;
  content: string;
  includedFindingIds: string[];
  includedContradictionIds: string[];
  includedClipIds: string[];
  s3ExportKey?: string;
  createdAt: string;
}

export interface UserReviewAction {
  id: string;
  claimProjectId: string;
  audioAssetId: string;
  targetType: "project" | "finding" | "contradiction" | "clip" | "transcript" | "export";
  targetId: string;
  action:
    | "approved"
    | "rejected"
    | "edited"
    | "noted"
    | "clipCreated"
    | "exported"
    | "submittedForSupervisorReview"
    | "supervisorApproved"
    | "supervisorReturned";
  previousValue?: unknown;
  newValue?: unknown;
  userId: string;
  createdAt: string;
}

export type AuditEventType =
  | "projectCreated"
  | "audioUploaded"
  | "transcriptionStarted"
  | "transcriptionCompleted"
  | "analysisStarted"
  | "analysisCompleted"
  | "findingApproved"
  | "findingRejected"
  | "findingEdited"
  | "contradictionApproved"
  | "contradictionRejected"
  | "clipCreated"
  | "exportGenerated"
  | "exportDownloaded"
  | "projectSubmittedForSupervisorReview"
  | "supervisorReviewApproved"
  | "supervisorReviewReturned"
  | "retentionPolicyUpdated"
  | "securitySettingUpdated";

export interface AuditLogEvent {
  id: string;
  claimProjectId?: string;
  audioAssetId?: string;
  eventType: AuditEventType;
  actor: string;
  targetType: "project" | "audio" | "transcript" | "analysis" | "finding" | "contradiction" | "clip" | "export";
  targetId: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ProcessingRun {
  projectId: string;
  audioAssetId: string;
  status: ProcessingStatus;
  message: string;
  error?: string;
  updatedAt: string;
}

export interface GeneratedExport {
  title: string;
  description: string;
  format: "Text" | "JSON" | "HTML";
  content: string;
  fileName: string;
  exportType: ExportMemo["exportType"];
  storageKey?: string;
  downloadUrl?: string;
  expiresAt?: string;
}
