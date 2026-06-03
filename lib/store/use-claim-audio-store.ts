"use client";

import { create } from "zustand";
import { backendApi, type BackendStatus, type ProjectBundle } from "@/lib/client/backend-api";
import {
  mockAuditEvents,
  mockAudioAssets,
  mockContradictions,
  mockEvidenceClips,
  mockExportMemos,
  mockFindings,
  mockProjects,
  mockTranscriptSegments
} from "@/lib/mock-data";
import {
  analysisService,
  auditLogService,
  clipService,
  storageService,
  transcriptionService
} from "@/lib/services";
import type {
  AuditLogEvent,
  AudioAsset,
  ClaimProject,
  Contradiction,
  EvidenceClip,
  EvidenceFinding,
  ExportMemo,
  ProcessingRun,
  ReviewStatus,
  TranscriptSegment
} from "@/lib/types";

export type NewProjectInput = Omit<
  ClaimProject,
  "id" | "audioAssetId" | "createdAt" | "updatedAt" | "status" | "reviewFlags"
>;

interface ClaimAudioState {
  backendStatus?: BackendStatus;
  backendMode: "unknown" | "mock-readonly" | "neon";
  isHydrating: boolean;
  lastSyncError?: string;
  projects: ClaimProject[];
  audioAssets: AudioAsset[];
  transcriptSegments: TranscriptSegment[];
  findings: EvidenceFinding[];
  contradictions: Contradiction[];
  clips: EvidenceClip[];
  exportMemos: ExportMemo[];
  auditEvents: AuditLogEvent[];
  processingRuns: Record<string, ProcessingRun>;
  currentTimeSeconds: number;
  selectedSegmentId?: string;
  selectedFindingId?: string;
  selectedRange: {
    startTimeSeconds: number;
    endTimeSeconds: number;
  };
  ensureBackendStatus: () => Promise<BackendStatus>;
  loadDashboardData: () => Promise<void>;
  loadProjectBundle: (projectId: string) => Promise<void>;
  loadAuditEvents: () => Promise<void>;
  setCurrentTime: (seconds: number) => void;
  selectTranscriptSegment: (segment: TranscriptSegment) => void;
  selectFinding: (finding: EvidenceFinding) => void;
  updateFindingStatus: (projectId: string, findingId: string, reviewStatus: ReviewStatus) => void;
  updateContradictionStatus: (
    projectId: string,
    contradictionId: string,
    reviewStatus: Extract<ReviewStatus, "approved" | "rejected">
  ) => void;
  editFinding: (
    projectId: string,
    findingId: string,
    updates: Pick<EvidenceFinding, "title" | "whyItMatters" | "recommendedFollowUp" | "notes">
  ) => void;
  createClip: (projectId: string, audioAssetId: string, title?: string) => Promise<void>;
  startMockProjectProcessing: (
    project: NewProjectInput,
    sourceType: AudioAsset["sourceType"],
    fileName?: string
  ) => Promise<ClaimProject>;
  startUploadedProjectProcessing: (project: NewProjectInput, file: File) => Promise<ClaimProject>;
  retryProcessing: (projectId: string) => void;
  updateSupervisorReview: (
    projectId: string,
    action: "submit" | "approve" | "return",
    note?: string
  ) => Promise<void>;
  recordExportGenerated: (
    projectId: string,
    audioAssetId: string,
    exportType: ExportMemo["exportType"],
    fileName: string
  ) => void;
}

const nowIso = () => new Date().toISOString();
const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const sourceAudioAssetId = "audio-7842-statement";

function upsertById<T extends { id: string }>(items: T[], nextItem: T) {
  const exists = items.some((item) => item.id === nextItem.id);

  if (!exists) {
    return [nextItem, ...items];
  }

  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

export const useClaimAudioStore = create<ClaimAudioState>((set, get) => {
  const appendAuditEvent = async (
    input: Parameters<typeof auditLogService.recordEvent>[0]
  ) => {
    const event = await auditLogService.recordEvent(input);

    set((state) => ({
      auditEvents: [event, ...state.auditEvents]
    }));

    return event;
  };

  const updateProcessingRun = (
    projectId: string,
    audioAssetId: string,
    status: ProcessingRun["status"],
    message: string,
    error?: string
  ) => {
    set((state) => ({
      processingRuns: {
        ...state.processingRuns,
        [projectId]: {
          projectId,
          audioAssetId,
          status,
          message,
          error,
          updatedAt: nowIso()
        }
      },
      projects: state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              status:
                status === "readyForReview"
                  ? "ready"
                  : status === "failed"
                    ? "failed"
                    : status,
              updatedAt: nowIso()
            }
          : project
      ),
      audioAssets: state.audioAssets.map((asset) =>
        asset.id === audioAssetId ? { ...asset, processingStatus: status } : asset
      )
    }));
  };

  const applyProjectBundle = (bundle: ProjectBundle) => {
    set((state) => ({
      projects: upsertById(state.projects, bundle.project),
      audioAssets: bundle.audioAsset ? upsertById(state.audioAssets, bundle.audioAsset) : state.audioAssets,
      transcriptSegments: [
        ...bundle.transcriptSegments,
        ...state.transcriptSegments.filter((segment) => segment.audioAssetId !== bundle.project.audioAssetId)
      ],
      findings: [
        ...bundle.findings,
        ...state.findings.filter((finding) => finding.audioAssetId !== bundle.project.audioAssetId)
      ],
      contradictions: [
        ...bundle.contradictions,
        ...state.contradictions.filter((contradiction) => contradiction.audioAssetId !== bundle.project.audioAssetId)
      ],
      clips: [
        ...bundle.clips,
        ...state.clips.filter((clip) => clip.claimProjectId !== bundle.project.id)
      ],
      exportMemos: [
        ...bundle.exportMemos,
        ...state.exportMemos.filter((memo) => memo.claimProjectId !== bundle.project.id)
      ],
      auditEvents: [
        ...bundle.auditEvents,
        ...state.auditEvents.filter((event) => event.claimProjectId !== bundle.project.id)
      ]
    }));
  };

  const isPersistentBackendEnabled = async () => {
    const existingStatus = get().backendStatus;

    if (existingStatus) {
      return existingStatus.neonConfigured;
    }

    const status = await get().ensureBackendStatus();

    return status.neonConfigured;
  };

  const pollServerProcessingPipeline = async (projectId: string, audioAssetId: string) => {
    for (let attempt = 0; attempt < 36; attempt += 1) {
      const status = await backendApi.getProcessingStatus(projectId);

      if (status.status === "readyForReview") {
        const { bundle } = await backendApi.getProjectBundle(projectId);
        applyProjectBundle(bundle);
        updateProcessingRun(projectId, audioAssetId, "readyForReview", status.message || "Evidence workspace is ready and persisted.");
        return;
      }

      if (status.status === "failed") {
        updateProcessingRun(
          projectId,
          audioAssetId,
          "failed",
          "Processing failed.",
          status.error || status.message || "Processing failed."
        );
        return;
      }

      updateProcessingRun(
        projectId,
        audioAssetId,
        status.status,
        status.message || "Amazon Transcribe is preparing the timestamped transcript."
      );
      await delay(10000);
    }

    updateProcessingRun(
      projectId,
      audioAssetId,
      "transcribing",
      "Amazon Transcribe is still running. You can return to this project later."
    );
  };

  const runServerProcessingPipeline = async (projectId: string, audioAssetId: string) => {
    try {
      updateProcessingRun(projectId, audioAssetId, "uploaded", "Audio received. Preparing persistent processing job.");
      await delay(500);

      updateProcessingRun(projectId, audioAssetId, "transcribing", "Server is writing timestamped transcript segments.");
      await delay(700);

      updateProcessingRun(projectId, audioAssetId, "analyzing", "Server is extracting evidence and contradictions.");
      const processing = await backendApi.processProject(projectId);

      if (processing.status === "transcribing") {
        updateProcessingRun(
          projectId,
          audioAssetId,
          "transcribing",
          processing.message || "Amazon Transcribe job started."
        );
        await pollServerProcessingPipeline(projectId, audioAssetId);
        return;
      }

      const { bundle } = await backendApi.getProjectBundle(projectId);
      applyProjectBundle(bundle);

      updateProcessingRun(projectId, audioAssetId, "readyForReview", "Evidence workspace is ready and persisted.");
    } catch (error) {
      updateProcessingRun(
        projectId,
        audioAssetId,
        "failed",
        "Server processing failed. Retry from the project page.",
        error instanceof Error ? error.message : "Unknown processing error"
      );
      set({ lastSyncError: error instanceof Error ? error.message : "Unknown processing error" });
    }
  };

  const runMockProcessingPipeline = async (projectId: string, audioAssetId: string) => {
    const project = get().projects.find((item) => item.id === projectId);

    if (!project) {
      return;
    }

    try {
      updateProcessingRun(projectId, audioAssetId, "uploaded", "Audio received. Preparing transcription job.");
      await delay(800);

      updateProcessingRun(projectId, audioAssetId, "transcribing", "Transcribing statement with speaker timestamps.");
      await delay(1200);

      const transcription = await transcriptionService.transcribe({
        sourceAudioAssetId,
        targetAudioAssetId: audioAssetId,
        claimNumber: project.claimNumber,
        claimantName: project.claimantName,
        insuredName: project.insuredName
      });
      const transcriptSegmentIdMap = new Map(
        transcription.transcriptSegments.map((segment) => [
          segment.id.replace(`${audioAssetId}-`, ""),
          segment.id
        ])
      );

      set((state) => ({
        transcriptSegments: [
          ...transcription.transcriptSegments,
          ...state.transcriptSegments.filter((segment) => segment.audioAssetId !== audioAssetId)
        ]
      }));

      await appendAuditEvent({
        claimProjectId: projectId,
        audioAssetId,
        eventType: "transcriptionCompleted",
        actor: "System",
        targetType: "transcript",
        targetId: audioAssetId,
        summary: `Transcription completed with ${transcription.transcriptSegments.length} timestamped segments.`,
        metadata: { engine: transcription.engine }
      });

      updateProcessingRun(projectId, audioAssetId, "analyzing", "Extracting claim evidence and contradictions.");
      await delay(1400);

      const analysis = await analysisService.analyze({
        claimProjectId: projectId,
        sourceAudioAssetId,
        targetAudioAssetId: audioAssetId,
        claimNumber: project.claimNumber,
        claimantName: project.claimantName,
        transcriptSegmentIdMap
      });

      set((state) => ({
        findings: [
          ...analysis.findings,
          ...state.findings.filter((finding) => finding.audioAssetId !== audioAssetId)
        ],
        contradictions: [
          ...analysis.contradictions,
          ...state.contradictions.filter((contradiction) => contradiction.audioAssetId !== audioAssetId)
        ],
        clips: [
          ...analysis.clips,
          ...state.clips.filter((clip) => clip.audioAssetId !== audioAssetId)
        ],
        exportMemos: [
          ...analysis.exportMemos,
          ...state.exportMemos.filter((memo) => memo.audioAssetId !== audioAssetId)
        ],
        projects: state.projects.map((item) =>
          item.id === projectId
            ? {
                ...item,
                reviewFlags: {
                  readyForReview: true,
                  needsSupervisorReview: true,
                  siuFlagged: true,
                  draftMemoReady: true
                },
                updatedAt: nowIso()
              }
            : item
        )
      }));

      await appendAuditEvent({
        claimProjectId: projectId,
        audioAssetId,
        eventType: "analysisCompleted",
        actor: "System",
        targetType: "analysis",
        targetId: audioAssetId,
        summary: `Analysis completed with ${analysis.findings.length} evidence findings and ${analysis.contradictions.length} contradictions.`,
        metadata: { modelProvider: analysis.modelProvider }
      });

      updateProcessingRun(projectId, audioAssetId, "readyForReview", "Evidence workspace is ready for review.");
    } catch (error) {
      updateProcessingRun(
        projectId,
        audioAssetId,
        "failed",
        "Processing failed. Retry the mock pipeline.",
        error instanceof Error ? error.message : "Unknown processing error"
      );
    }
  };

  return {
    backendMode: "unknown",
    isHydrating: false,
    lastSyncError: undefined,
    projects: mockProjects,
    audioAssets: mockAudioAssets,
    transcriptSegments: mockTranscriptSegments,
    findings: mockFindings,
    contradictions: mockContradictions,
    clips: mockEvidenceClips,
    exportMemos: mockExportMemos,
    auditEvents: mockAuditEvents,
    processingRuns: {},
    currentTimeSeconds: 0,
    selectedRange: {
      startTimeSeconds: 75,
      endTimeSeconds: 93
    },
    ensureBackendStatus: async () => {
      try {
        const { backend } = await backendApi.getHealth();

        set({
          backendStatus: backend,
          backendMode: backend.neonConfigured ? "neon" : "mock-readonly",
          lastSyncError: undefined
        });

        return backend;
      } catch (error) {
        const fallbackStatus: BackendStatus = {
          backendMode: "mock",
          neonConfigured: false,
          awsConfigured: false,
          auth: {
            requireAuth: true,
            authConfigured: false,
            pilotAccessCodeConfigured: false,
            supervisorAccessCodeConfigured: false,
            adminAccessCodeConfigured: false,
            sessionSecretConfigured: false,
            tenantIdConfigured: false,
            authProvider: "pilot-cookie"
          },
          missingNeonEnv: ["DATABASE_URL"],
          missingAwsEnv: []
        };

        set({
          backendStatus: fallbackStatus,
          backendMode: "mock-readonly",
          lastSyncError: error instanceof Error ? error.message : "Unable to reach backend health endpoint."
        });

        return fallbackStatus;
      }
    },
    loadDashboardData: async () => {
      set({ isHydrating: true });

      try {
        const data = await backendApi.listProjects();

        set((state) => ({
          backendStatus: data.backend,
          backendMode: data.mode,
          projects: data.projects,
          audioAssets: data.audioAssets || state.audioAssets,
          findings: data.findings || state.findings,
          contradictions: data.contradictions || state.contradictions,
          clips: data.clips || state.clips,
          exportMemos: data.exportMemos || state.exportMemos,
          auditEvents: data.auditEvents || state.auditEvents,
          isHydrating: false,
          lastSyncError: undefined
        }));
      } catch (error) {
        set({
          isHydrating: false,
          backendMode: "mock-readonly",
          lastSyncError: error instanceof Error ? error.message : "Unable to load project data."
        });
      }
    },
    loadProjectBundle: async (projectId) => {
      set({ isHydrating: true });

      try {
        const { backend, mode, bundle } = await backendApi.getProjectBundle(projectId);
        applyProjectBundle(bundle);
        set({
          backendStatus: backend,
          backendMode: mode,
          isHydrating: false,
          lastSyncError: undefined
        });
      } catch (error) {
        set({
          isHydrating: false,
          lastSyncError: error instanceof Error ? error.message : "Unable to load project bundle."
        });
      }
    },
    loadAuditEvents: async () => {
      try {
        const { backend, mode, auditEvents } = await backendApi.listAuditEvents();

        set({
          backendStatus: backend,
          backendMode: mode,
          auditEvents,
          lastSyncError: undefined
        });
      } catch (error) {
        set({
          lastSyncError: error instanceof Error ? error.message : "Unable to load audit events."
        });
      }
    },
    setCurrentTime: (seconds) =>
      set({
        currentTimeSeconds: Math.max(0, seconds),
        selectedRange: {
          startTimeSeconds: Math.max(0, seconds),
          endTimeSeconds: Math.max(0, seconds + 18)
        }
      }),
    selectTranscriptSegment: (segment) =>
      set({
        currentTimeSeconds: segment.startTimeSeconds,
        selectedSegmentId: segment.id,
        selectedRange: {
          startTimeSeconds: segment.startTimeSeconds,
          endTimeSeconds: segment.endTimeSeconds
        }
      }),
    selectFinding: (finding) =>
      set({
        currentTimeSeconds: finding.startTimeSeconds,
        selectedFindingId: finding.id,
        selectedRange: {
          startTimeSeconds: finding.startTimeSeconds,
          endTimeSeconds: finding.endTimeSeconds
        },
        selectedSegmentId: finding.relatedTranscriptSegmentIds[0]
      }),
    updateFindingStatus: (projectId, findingId, reviewStatus) => {
      const finding = get().findings.find((item) => item.id === findingId);

      if (!finding) {
        return;
      }

      set((state) => ({
        findings: state.findings.map((item) =>
          item.id === findingId ? { ...item, reviewStatus } : item
        )
      }));

      void (async () => {
        const useBackend = await isPersistentBackendEnabled();

        if (useBackend && reviewStatus !== "edited") {
          try {
            const { finding: persistedFinding } = await backendApi.reviewFinding(projectId, findingId, reviewStatus);

            set((state) => ({
              findings: state.findings.map((item) =>
                item.id === findingId ? persistedFinding : item
              )
            }));
            await get().loadProjectBundle(projectId);
            return;
          } catch (error) {
            set((state) => ({
              findings: state.findings.map((item) => (item.id === findingId ? finding : item)),
              lastSyncError: error instanceof Error ? error.message : "Unable to persist review action."
            }));
            return;
          }
        }

        await appendAuditEvent({
          claimProjectId: projectId,
          audioAssetId: finding.audioAssetId,
          eventType: reviewStatus === "approved" ? "findingApproved" : "findingRejected",
          targetType: "finding",
          targetId: findingId,
          summary: `${reviewStatus === "approved" ? "Approved" : "Rejected"} finding: ${finding.title}.`,
          metadata: {
            previousStatus: finding.reviewStatus,
            newStatus: reviewStatus,
            category: finding.category,
            timestamp: `${finding.startTimeSeconds}-${finding.endTimeSeconds}`
          }
        });
      })();
    },
    updateContradictionStatus: (projectId, contradictionId, reviewStatus) => {
      const contradiction = get().contradictions.find((item) => item.id === contradictionId);

      if (!contradiction) {
        return;
      }

      set((state) => ({
        contradictions: state.contradictions.map((item) =>
          item.id === contradictionId ? { ...item, reviewStatus } : item
        )
      }));

      void (async () => {
        const useBackend = await isPersistentBackendEnabled();

        if (useBackend) {
          try {
            const { contradiction: persistedContradiction } = await backendApi.reviewContradiction(
              projectId,
              contradictionId,
              reviewStatus
            );

            set((state) => ({
              contradictions: state.contradictions.map((item) =>
                item.id === contradictionId ? persistedContradiction : item
              )
            }));
            await get().loadProjectBundle(projectId);
            return;
          } catch (error) {
            set({
              contradictions: get().contradictions.map((item) =>
                item.id === contradictionId ? contradiction : item
              ),
              lastSyncError:
                error instanceof Error ? error.message : "Unable to persist contradiction review action."
            });
            return;
          }
        }

        await appendAuditEvent({
          claimProjectId: projectId,
          audioAssetId: contradiction.audioAssetId,
          eventType: reviewStatus === "approved" ? "contradictionApproved" : "contradictionRejected",
          targetType: "contradiction",
          targetId: contradictionId,
          summary: `${reviewStatus === "approved" ? "Approved" : "Rejected"} contradiction: ${
            contradiction.title
          }.`,
          metadata: {
            previousStatus: contradiction.reviewStatus,
            newStatus: reviewStatus,
            timestampA: contradiction.timestampA,
            timestampB: contradiction.timestampB
          }
        });
      })();
    },
    editFinding: (projectId, findingId, updates) => {
      const finding = get().findings.find((item) => item.id === findingId);

      if (!finding) {
        return;
      }

      set((state) => ({
        findings: state.findings.map((item) =>
          item.id === findingId ? { ...item, ...updates, reviewStatus: "edited" } : item
        )
      }));

      void (async () => {
        const useBackend = await isPersistentBackendEnabled();

        if (useBackend) {
          try {
            const { finding: persistedFinding } = await backendApi.editFinding(projectId, findingId, updates);

            set((state) => ({
              findings: state.findings.map((item) =>
                item.id === findingId ? persistedFinding : item
              )
            }));
            await get().loadProjectBundle(projectId);
            return;
          } catch (error) {
            set((state) => ({
              findings: state.findings.map((item) => (item.id === findingId ? finding : item)),
              lastSyncError: error instanceof Error ? error.message : "Unable to persist finding edit."
            }));
            return;
          }
        }

        await appendAuditEvent({
          claimProjectId: projectId,
          audioAssetId: finding.audioAssetId,
          eventType: "findingEdited",
          targetType: "finding",
          targetId: findingId,
          summary: `Edited finding interpretation: ${updates.title}.`,
          metadata: {
            originalTitle: finding.title,
            editedTitle: updates.title,
            quotePreserved: finding.exactQuote
          }
        });
      })();
    },
    createClip: async (projectId, audioAssetId, title) => {
      const { selectedRange, transcriptSegments, selectedFindingId, findings } = get();
      const linkedFindingIds = selectedFindingId ? [selectedFindingId] : [];
      const transcriptExcerpt =
        transcriptSegments
          .filter(
            (segment) =>
              segment.audioAssetId === audioAssetId &&
              segment.startTimeSeconds < selectedRange.endTimeSeconds &&
              segment.endTimeSeconds > selectedRange.startTimeSeconds
          )
          .map((segment) => segment.text)
          .join(" ")
          .slice(0, 220) || "Selected timestamp range";
      const selectedFinding = selectedFindingId
        ? findings.find((finding) => finding.id === selectedFindingId)
        : undefined;

      if (await isPersistentBackendEnabled()) {
        try {
          const { clip } = await backendApi.createClip(projectId, {
            audioAssetId,
            title: title || selectedFinding?.title || "Evidence clip",
            startTimeSeconds: selectedRange.startTimeSeconds,
            endTimeSeconds: selectedRange.endTimeSeconds,
            transcriptExcerpt,
            linkedFindingIds
          });

          set((state) => ({
            clips: [clip, ...state.clips.filter((item) => item.id !== clip.id)]
          }));
          await get().loadProjectBundle(projectId);
          return;
        } catch (error) {
          set({ lastSyncError: error instanceof Error ? error.message : "Unable to persist evidence clip." });
          return;
        }
      }

      const clip = await clipService.createClip({
        claimProjectId: projectId,
        audioAssetId,
        title: title || selectedFinding?.title || "Evidence clip",
        startTimeSeconds: selectedRange.startTimeSeconds,
        endTimeSeconds: selectedRange.endTimeSeconds,
        transcriptExcerpt,
        linkedFindingIds,
        createdBy: "Demo Reviewer"
      });

      set((state) => ({
        clips: [clip, ...state.clips]
      }));

      await appendAuditEvent({
        claimProjectId: projectId,
        audioAssetId,
        eventType: "clipCreated",
        targetType: "clip",
        targetId: clip.id,
        summary: `Created evidence clip: ${clip.title}.`,
        metadata: {
          startTimeSeconds: clip.startTimeSeconds,
          endTimeSeconds: clip.endTimeSeconds,
          linkedFindingIds
        }
      });
    },
    startMockProjectProcessing: async (projectInput, sourceType, fileName) => {
      const normalizedFileName =
        fileName ||
        (sourceType === "sample"
          ? "sample_auto_bi_recorded_statement.wav"
          : "fake_uploaded_recorded_statement.wav");

      if (await isPersistentBackendEnabled()) {
        const { project, audioAsset } = await backendApi.createProject(
          projectInput,
          sourceType,
          normalizedFileName
        );

        set((state) => ({
          projects: [project, ...state.projects.filter((item) => item.id !== project.id)],
          audioAssets: [audioAsset, ...state.audioAssets.filter((asset) => asset.id !== audioAsset.id)],
          processingRuns: {
            ...state.processingRuns,
            [project.id]: {
              projectId: project.id,
              audioAssetId: audioAsset.id,
              status: "uploaded",
              message: "Audio received. Preparing persistent processing job.",
              updatedAt: nowIso()
            }
          }
        }));

        void runServerProcessingPipeline(project.id, audioAsset.id);

        return project;
      }

      const id = `claim-${crypto.randomUUID().slice(0, 8)}`;
      const audioAssetId = `audio-${id}-${sourceType}`;
      const project: ClaimProject = {
        ...projectInput,
        id,
        audioAssetId,
        status: "uploaded",
        reviewFlags: {
          readyForReview: false,
          needsSupervisorReview: false,
          siuFlagged: false,
          draftMemoReady: false
        },
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      const audioAsset = await storageService.createMockAudioAsset({
        id: audioAssetId,
        claimProjectId: id,
        sourceType,
        fileName: normalizedFileName
      });

      set((state) => ({
        projects: [project, ...state.projects],
        audioAssets: [audioAsset, ...state.audioAssets],
        processingRuns: {
          ...state.processingRuns,
          [id]: {
            projectId: id,
            audioAssetId,
            status: "uploaded",
            message: "Audio received. Preparing transcription job.",
            updatedAt: nowIso()
          }
        }
      }));

      await appendAuditEvent({
        claimProjectId: id,
        audioAssetId,
        eventType: "projectCreated",
        targetType: "project",
        targetId: id,
        summary: `Project ${project.claimNumber} created.`
      });
      await appendAuditEvent({
        claimProjectId: id,
        audioAssetId,
        eventType: "audioUploaded",
        targetType: "audio",
        targetId: audioAssetId,
        summary: `${sourceType === "sample" ? "Sample statement selected" : "Fake audio upload completed"} for processing.`,
        metadata: {
          storageRegistered: Boolean(audioAsset.storageUrl),
          sourceType
        }
      });

      void runMockProcessingPipeline(id, audioAssetId);

      return project;
    },
    startUploadedProjectProcessing: async (projectInput, file) => {
      const backendStatus = await get().ensureBackendStatus();

      if (!backendStatus.neonConfigured) {
        return get().startMockProjectProcessing(projectInput, "uploaded", file.name);
      }

      if (!backendStatus.awsConfigured) {
        throw new Error("Real audio upload is not configured yet. Use the sample statement for this pilot workspace.");
      }

      const { project, audioAsset, signedUpload } = await backendApi.createUploadedProject(projectInput, file);

      if (!signedUpload) {
        throw new Error("Signed upload URL was not returned by the backend.");
      }

      set((state) => ({
        projects: [project, ...state.projects.filter((item) => item.id !== project.id)],
        audioAssets: [audioAsset, ...state.audioAssets.filter((asset) => asset.id !== audioAsset.id)],
        processingRuns: {
          ...state.processingRuns,
          [project.id]: {
            projectId: project.id,
            audioAssetId: audioAsset.id,
            status: "uploaded",
            message: "Uploading audio to encrypted S3 storage.",
            updatedAt: nowIso()
          }
        }
      }));

      await fetch(signedUpload.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`S3 upload failed with status ${response.status}.`);
        }
      });

      updateProcessingRun(project.id, audioAsset.id, "uploaded", "Audio uploaded to S3. Starting Amazon Transcribe.");
      void runServerProcessingPipeline(project.id, audioAsset.id);

      return project;
    },
    retryProcessing: (projectId) => {
      const audioAsset = get().audioAssets.find((asset) => asset.claimProjectId === projectId);

      if (!audioAsset) {
        return;
      }

      set((state) => ({
        transcriptSegments: state.transcriptSegments.filter((segment) => segment.audioAssetId !== audioAsset.id),
        findings: state.findings.filter((finding) => finding.audioAssetId !== audioAsset.id),
        contradictions: state.contradictions.filter((contradiction) => contradiction.audioAssetId !== audioAsset.id),
        clips: state.clips.filter((clip) => clip.audioAssetId !== audioAsset.id),
        exportMemos: state.exportMemos.filter((memo) => memo.audioAssetId !== audioAsset.id)
      }));

      void (async () => {
        if (await isPersistentBackendEnabled()) {
          void runServerProcessingPipeline(projectId, audioAsset.id);
          return;
        }

        void runMockProcessingPipeline(projectId, audioAsset.id);
      })();
    },
    updateSupervisorReview: async (projectId, action, note) => {
      const project = get().projects.find((item) => item.id === projectId);
      const audioAsset = get().audioAssets.find((asset) => asset.claimProjectId === projectId);

      if (!project || !audioAsset) {
        return;
      }

      const reviewedFindingCount = get().findings.filter(
        (finding) =>
          finding.audioAssetId === project.audioAssetId &&
          (finding.reviewStatus === "approved" || finding.reviewStatus === "edited")
      ).length;

      if (action === "submit" && reviewedFindingCount === 0) {
        set({ lastSyncError: "Approve or edit at least one finding before submitting for supervisor review." });
        return;
      }

      if (await isPersistentBackendEnabled()) {
        try {
          const { project: persistedProject } = await backendApi.updateSupervisorReview(projectId, action, note);

          set((state) => ({
            projects: state.projects.map((item) => (item.id === projectId ? persistedProject : item))
          }));
          await get().loadProjectBundle(projectId);
          return;
        } catch (error) {
          set({
            lastSyncError:
              error instanceof Error ? error.message : "Unable to update supervisor review workflow."
          });
          return;
        }
      }

      const next =
        action === "approve"
          ? {
              status: "ready" as const,
              eventType: "supervisorReviewApproved" as const,
              summary: `Supervisor approved review packet for ${project.claimNumber}.`,
              flags: {
                needsSupervisorReview: false,
                supervisorApproved: true,
                supervisorReturned: false,
                draftMemoReady: true
              }
            }
          : action === "return"
            ? {
                status: "reviewing" as const,
                eventType: "supervisorReviewReturned" as const,
                summary: `Supervisor returned review packet for changes on ${project.claimNumber}.`,
                flags: {
                  needsSupervisorReview: false,
                  supervisorApproved: false,
                  supervisorReturned: true,
                  draftMemoReady: false
                }
              }
            : {
                status: "needsSupervisorReview" as const,
                eventType: "projectSubmittedForSupervisorReview" as const,
                summary: `Submitted ${project.claimNumber} for supervisor review.`,
                flags: {
                  needsSupervisorReview: true,
                  supervisorApproved: false,
                  supervisorReturned: false,
                  draftMemoReady: true
                }
              };

      set((state) => ({
        projects: state.projects.map((item) =>
          item.id === projectId
            ? {
                ...item,
                status: next.status,
                reviewFlags: {
                  ...item.reviewFlags,
                  ...next.flags
                },
                updatedAt: nowIso()
              }
            : item
        ),
        lastSyncError: undefined
      }));

      await appendAuditEvent({
        claimProjectId: projectId,
        audioAssetId: audioAsset.id,
        eventType: next.eventType,
        targetType: "project",
        targetId: projectId,
        summary: next.summary,
        metadata: {
          note,
          reviewedFindingCount
        }
      });
    },
    recordExportGenerated: (projectId, audioAssetId, exportType, fileName) => {
      void (async () => {
        if (await isPersistentBackendEnabled()) {
          try {
            const { exportMemo } = await backendApi.generateExport(projectId, exportType);

            set((state) => ({
              exportMemos: [exportMemo, ...state.exportMemos.filter((memo) => memo.id !== exportMemo.id)]
            }));
            await get().loadProjectBundle(projectId);
            return;
          } catch (error) {
            set({ lastSyncError: error instanceof Error ? error.message : "Unable to persist generated export." });
            return;
          }
        }

        await appendAuditEvent({
          claimProjectId: projectId,
          audioAssetId,
          eventType: "exportGenerated",
          targetType: "export",
          targetId: fileName,
          summary: `Generated export: ${fileName}.`,
          metadata: { exportType }
        });
      })();
    }
  };
});
