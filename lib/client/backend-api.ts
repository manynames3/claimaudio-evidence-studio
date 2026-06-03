import type {
  AuditLogEvent,
  AudioAsset,
  ClaimProject,
  Contradiction,
  EvidenceClip,
  EvidenceFinding,
  ExportMemo,
  GeneratedExport,
  ReviewStatus,
  TranscriptSegment
} from "@/lib/types";

export interface BackendStatus {
  backendMode: "mock" | "neon-aws";
  neonConfigured: boolean;
  awsConfigured: boolean;
  auth: {
    requireAuth: boolean;
    authConfigured: boolean;
    pilotAccessCodeConfigured: boolean;
    supervisorAccessCodeConfigured: boolean;
    adminAccessCodeConfigured: boolean;
    sessionSecretConfigured: boolean;
    tenantIdConfigured: boolean;
    authProvider: "pilot-cookie" | "disabled";
  };
  missingNeonEnv: string[];
  missingAwsEnv: string[];
}

export interface ProjectBundle {
  project: ClaimProject;
  audioAsset?: AudioAsset;
  transcriptSegments: TranscriptSegment[];
  findings: EvidenceFinding[];
  contradictions: Contradiction[];
  clips: EvidenceClip[];
  exportMemos: ExportMemo[];
  auditEvents: AuditLogEvent[];
}

export interface DashboardData {
  backend: BackendStatus;
  mode: "mock-readonly" | "neon";
  projects: ClaimProject[];
  audioAssets?: AudioAsset[];
  findings?: EvidenceFinding[];
  contradictions?: Contradiction[];
  clips?: EvidenceClip[];
  exportMemos?: ExportMemo[];
  auditEvents?: AuditLogEvent[];
}

export type NewProjectInput = Omit<
  ClaimProject,
  "id" | "audioAssetId" | "createdAt" | "updatedAt" | "status" | "reviewFlags"
>;

export const MAX_AUDIO_UPLOAD_BYTES = 100 * 1024 * 1024;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

export const backendApi = {
  async getHealth() {
    return fetchJson<{ backend: BackendStatus }>("/api/health");
  },

  async listProjects() {
    return fetchJson<DashboardData>("/api/projects");
  },

  async getProjectBundle(projectId: string) {
    return fetchJson<{ backend: BackendStatus; mode: "mock-readonly" | "neon"; bundle: ProjectBundle }>(
      `/api/projects/${projectId}`
    );
  },

  async createProject(input: NewProjectInput, sourceType: AudioAsset["sourceType"], fileName: string) {
    return fetchJson<{
      project: ClaimProject;
      audioAsset: AudioAsset;
      signedUpload?: {
        uploadUrl: string;
        storageKey: string;
        expiresAt: string;
      };
    }>("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        sourceType,
        fileName
      })
    });
  },

  async createUploadedProject(input: NewProjectInput, file: File) {
    return fetchJson<{
      project: ClaimProject;
      audioAsset: AudioAsset;
      signedUpload?: {
        uploadUrl: string;
        storageKey: string;
        expiresAt: string;
      };
    }>("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        sourceType: "uploaded",
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        fileSizeBytes: file.size
      })
    });
  },

  async processProject(projectId: string) {
    return fetchJson<{
      status: "readyForReview" | "transcribing";
      message?: string;
      transcriptionJobName?: string;
      transcriptSegments: number;
      findings: number;
      contradictions: number;
      clips: number;
      exportMemos: number;
    }>(`/api/projects/${projectId}/processing`, {
      method: "POST",
      body: JSON.stringify({})
    });
  },

  async getProcessingStatus(projectId: string) {
    return fetchJson<{
      status: "uploaded" | "transcribing" | "analyzing" | "readyForReview" | "failed";
      message?: string;
      error?: string;
      transcriptionJobName?: string;
      transcribeStatus?: string;
      transcriptSegments?: number;
      findings?: number;
      contradictions?: number;
    }>(`/api/projects/${projectId}/processing`);
  },

  async reviewFinding(projectId: string, findingId: string, reviewStatus: ReviewStatus) {
    return fetchJson<{ finding: EvidenceFinding }>(`/api/projects/${projectId}/review-actions`, {
      method: "POST",
      body: JSON.stringify({
        findingId,
        reviewStatus
      })
    });
  },

  async editFinding(
    projectId: string,
    findingId: string,
    updates: Pick<EvidenceFinding, "title" | "whyItMatters" | "recommendedFollowUp" | "notes">
  ) {
    return fetchJson<{ finding: EvidenceFinding }>(`/api/projects/${projectId}/review-actions`, {
      method: "POST",
      body: JSON.stringify({
        findingId,
        reviewStatus: "edited",
        updates
      })
    });
  },

  async reviewContradiction(
    projectId: string,
    contradictionId: string,
    reviewStatus: Extract<ReviewStatus, "approved" | "rejected">
  ) {
    return fetchJson<{ contradiction: Contradiction }>(`/api/projects/${projectId}/review-actions`, {
      method: "POST",
      body: JSON.stringify({
        contradictionId,
        reviewStatus
      })
    });
  },

  async createClip(
    projectId: string,
    input: Pick<
      EvidenceClip,
      "audioAssetId" | "title" | "startTimeSeconds" | "endTimeSeconds" | "transcriptExcerpt" | "linkedFindingIds"
    >
  ) {
    return fetchJson<{ clip: EvidenceClip }>(`/api/projects/${projectId}/clips`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  async generateExport(projectId: string, exportType: ExportMemo["exportType"]) {
    return fetchJson<{ generatedExport: GeneratedExport; exportMemo: ExportMemo }>(
      `/api/projects/${projectId}/exports`,
      {
        method: "POST",
        body: JSON.stringify({ exportType })
      }
    );
  },

  async recordExportDownload(
    projectId: string,
    input: {
      exportMemoId: string;
      fileName: string;
      exportType: ExportMemo["exportType"];
    }
  ) {
    return fetchJson<{ ok: true; downloadUrl?: string; expiresAt?: string }>(
      `/api/projects/${projectId}/exports/download`,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
  },

  async updateSupervisorReview(
    projectId: string,
    action: "submit" | "approve" | "return",
    note?: string
  ) {
    return fetchJson<{ project: ClaimProject }>(`/api/projects/${projectId}/supervisor-review`, {
      method: "POST",
      body: JSON.stringify({ action, note })
    });
  },

  async listAuditEvents(limit = 100) {
    return fetchJson<{
      backend: BackendStatus;
      mode: "mock-readonly" | "neon";
      auditEvents: AuditLogEvent[];
    }>(`/api/audit-events?limit=${limit}`);
  }
};
