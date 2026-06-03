import { asRows, getNeonSql, toNumber, toRecord, toStringArray } from "@/lib/db/neon";
import type {
  AuditLogEvent,
  AudioAsset,
  ClaimProject,
  Contradiction,
  EvidenceClip,
  EvidenceFinding,
  ExportMemo,
  ReviewStatus,
  TranscriptSegment,
  UserReviewAction
} from "@/lib/types";

export const DEFAULT_DEMO_TENANT_ID = "11111111-1111-4111-8111-111111111111";

export interface ClaimProjectBundle {
  project: ClaimProject;
  audioAsset?: AudioAsset;
  transcriptSegments: TranscriptSegment[];
  findings: EvidenceFinding[];
  contradictions: Contradiction[];
  clips: EvidenceClip[];
  exportMemos: ExportMemo[];
  auditEvents: AuditLogEvent[];
}

export interface ClaimProjectDashboardData {
  projects: ClaimProject[];
  audioAssets: AudioAsset[];
  findings: EvidenceFinding[];
  contradictions: Contradiction[];
  clips: EvidenceClip[];
  exportMemos: ExportMemo[];
  auditEvents: AuditLogEvent[];
}

export interface SaveAnalysisResultInput {
  findings: EvidenceFinding[];
  contradictions: Contradiction[];
  clips: EvidenceClip[];
  exportMemos: ExportMemo[];
}

export interface ClaimAudioRepository {
  ensureDemoTenant(): Promise<void>;
  listProjects(): Promise<ClaimProject[]>;
  listDashboardData(): Promise<ClaimProjectDashboardData>;
  getProjectBundle(projectId: string): Promise<ClaimProjectBundle | null>;
  createProjectWithAudioAsset(project: ClaimProject, audioAsset: AudioAsset): Promise<void>;
  updateProjectProcessingStatus(
    projectId: string,
    audioAssetId: string,
    projectStatus: ClaimProject["status"],
    audioStatus: AudioAsset["processingStatus"]
  ): Promise<void>;
  markProjectReadyForReview(projectId: string): Promise<void>;
  saveTranscriptSegments(segments: TranscriptSegment[]): Promise<void>;
  saveAnalysisResult(input: SaveAnalysisResultInput): Promise<void>;
  updateFindingReviewStatus(findingId: string, reviewStatus: ReviewStatus): Promise<EvidenceFinding | null>;
  updateContradictionReviewStatus(contradictionId: string, reviewStatus: ReviewStatus): Promise<Contradiction | null>;
  editFinding(
    findingId: string,
    updates: Pick<EvidenceFinding, "title" | "whyItMatters" | "recommendedFollowUp" | "notes">
  ): Promise<EvidenceFinding | null>;
  createClip(clip: EvidenceClip): Promise<void>;
  updateProjectReviewState(
    projectId: string,
    status: ClaimProject["status"],
    reviewFlags: Partial<ClaimProject["reviewFlags"]>
  ): Promise<ClaimProject | null>;
  recordUserReviewAction(action: UserReviewAction): Promise<void>;
  recordAuditEvent(event: AuditLogEvent): Promise<void>;
  listAuditEvents(limit?: number): Promise<AuditLogEvent[]>;
  insertExportMemo(memo: ExportMemo): Promise<void>;
}

export class NeonClaimAudioRepository implements ClaimAudioRepository {
  private readonly tenantId: string;

  constructor(tenantId = process.env.CLAIMAUDIO_TENANT_ID || DEFAULT_DEMO_TENANT_ID) {
    this.tenantId = tenantId;
  }

  async ensureDemoTenant() {
    const sql = getNeonSql();

    await sql`
      insert into tenants (id, name, data_region, retention_days, no_model_training)
      values (${this.tenantId}::uuid, 'ClaimAudio Demo Tenant', 'us-east-1', 365, true)
      on conflict (id) do nothing
    `;
  }

  async listProjects() {
    await this.ensureDemoTenant();
    const sql = getNeonSql();
    const rows = asRows(await sql`
      select *
      from claim_projects
      where tenant_id = ${this.tenantId}::uuid
      order by created_at desc
    `);

    return rows.map(mapProjectRow);
  }

  async listDashboardData() {
    await this.ensureDemoTenant();
    const sql = getNeonSql();
    const [
      projectRows,
      audioRows,
      findingRows,
      contradictionRows,
      clipRows,
      memoRows,
      auditRows
    ] = (await Promise.all([
      sql`
        select *
        from claim_projects
        where tenant_id = ${this.tenantId}::uuid
        order by created_at desc
      `,
      sql`
        select audio_assets.*
        from audio_assets
        join claim_projects on claim_projects.id = audio_assets.claim_project_id
        where audio_assets.tenant_id = ${this.tenantId}::uuid
        order by audio_assets.created_at desc
      `,
      sql`
        select evidence_findings.*
        from evidence_findings
        join audio_assets on audio_assets.id = evidence_findings.audio_asset_id
        where evidence_findings.tenant_id = ${this.tenantId}::uuid
        order by evidence_findings.start_time_seconds asc
      `,
      sql`
        select contradictions.*
        from contradictions
        join audio_assets on audio_assets.id = contradictions.audio_asset_id
        where contradictions.tenant_id = ${this.tenantId}::uuid
        order by contradictions.timestamp_a asc
      `,
      sql`
        select evidence_clips.*
        from evidence_clips
        where tenant_id = ${this.tenantId}::uuid
        order by created_at desc
      `,
      sql`
        select export_memos.*
        from export_memos
        where tenant_id = ${this.tenantId}::uuid
        order by created_at desc
      `,
      sql`
        select *
        from audit_log_events
        where tenant_id = ${this.tenantId}::uuid
        order by created_at desc
        limit 250
      `
    ])).map(asRows);

    return {
      projects: projectRows.map(mapProjectRow),
      audioAssets: audioRows.map(mapAudioAssetRow),
      findings: findingRows.map(mapFindingRow),
      contradictions: contradictionRows.map(mapContradictionRow),
      clips: clipRows.map(mapClipRow),
      exportMemos: memoRows.map(mapExportMemoRow),
      auditEvents: auditRows.map(mapAuditEventRow)
    };
  }

  async getProjectBundle(projectId: string) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();
    const projectRows = asRows(await sql`
      select *
      from claim_projects
      where tenant_id = ${this.tenantId}::uuid and id = ${projectId}
      limit 1
    `);

    if (!projectRows[0]) {
      return null;
    }

    const project = mapProjectRow(projectRows[0]);
    const [
      audioRows,
      transcriptRows,
      findingRows,
      contradictionRows,
      clipRows,
      memoRows,
      auditRows
    ] = (await Promise.all([
      sql`
        select *
        from audio_assets
        where tenant_id = ${this.tenantId}::uuid and claim_project_id = ${projectId}
        order by created_at desc
      `,
      sql`
        select *
        from transcript_segments
        where tenant_id = ${this.tenantId}::uuid and audio_asset_id = ${project.audioAssetId}
        order by start_time_seconds asc
      `,
      sql`
        select *
        from evidence_findings
        where tenant_id = ${this.tenantId}::uuid and audio_asset_id = ${project.audioAssetId}
        order by start_time_seconds asc
      `,
      sql`
        select *
        from contradictions
        where tenant_id = ${this.tenantId}::uuid and audio_asset_id = ${project.audioAssetId}
        order by timestamp_a asc
      `,
      sql`
        select *
        from evidence_clips
        where tenant_id = ${this.tenantId}::uuid and claim_project_id = ${projectId}
        order by created_at desc
      `,
      sql`
        select *
        from export_memos
        where tenant_id = ${this.tenantId}::uuid and claim_project_id = ${projectId}
        order by created_at desc
      `,
      sql`
        select *
        from audit_log_events
        where tenant_id = ${this.tenantId}::uuid and claim_project_id = ${projectId}
        order by created_at desc
      `
    ])).map(asRows);

    return {
      project,
      audioAsset: audioRows[0] ? mapAudioAssetRow(audioRows[0]) : undefined,
      transcriptSegments: transcriptRows.map(mapTranscriptSegmentRow),
      findings: findingRows.map(mapFindingRow),
      contradictions: contradictionRows.map(mapContradictionRow),
      clips: clipRows.map(mapClipRow),
      exportMemos: memoRows.map(mapExportMemoRow),
      auditEvents: auditRows.map(mapAuditEventRow)
    };
  }

  async createProjectWithAudioAsset(project: ClaimProject, audioAsset: AudioAsset) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();

    await sql`
      insert into claim_projects (
        id,
        tenant_id,
        claim_number,
        claimant_name,
        insured_name,
        loss_date,
        claim_type,
        line_of_business,
        status,
        audio_asset_id,
        review_flags,
        created_at,
        updated_at
      )
      values (
        ${project.id},
        ${this.tenantId}::uuid,
        ${project.claimNumber},
        ${project.claimantName},
        ${project.insuredName},
        ${project.lossDate},
        ${project.claimType},
        ${project.lineOfBusiness},
        ${project.status},
        null,
        ${JSON.stringify(project.reviewFlags)}::jsonb,
        ${project.createdAt},
        ${project.updatedAt}
      )
      on conflict (id) do update set
        claim_number = excluded.claim_number,
        claimant_name = excluded.claimant_name,
        insured_name = excluded.insured_name,
        loss_date = excluded.loss_date,
        claim_type = excluded.claim_type,
        line_of_business = excluded.line_of_business,
        status = excluded.status,
        review_flags = excluded.review_flags,
        updated_at = excluded.updated_at
    `;

    await sql`
      insert into audio_assets (
        id,
        tenant_id,
        claim_project_id,
        file_name,
        duration_seconds,
        source_type,
        processing_status,
        storage_url,
        created_at
      )
      values (
        ${audioAsset.id},
        ${this.tenantId}::uuid,
        ${audioAsset.claimProjectId},
        ${audioAsset.fileName},
        ${audioAsset.durationSeconds},
        ${audioAsset.sourceType},
        ${audioAsset.processingStatus},
        ${audioAsset.storageUrl || null},
        ${audioAsset.createdAt}
      )
      on conflict (id) do update set
        file_name = excluded.file_name,
        duration_seconds = excluded.duration_seconds,
        source_type = excluded.source_type,
        processing_status = excluded.processing_status,
        storage_url = excluded.storage_url
    `;

    await sql`
      update claim_projects
      set audio_asset_id = ${audioAsset.id}, updated_at = now()
      where tenant_id = ${this.tenantId}::uuid and id = ${project.id}
    `;
  }

  async updateProjectProcessingStatus(
    projectId: string,
    audioAssetId: string,
    projectStatus: ClaimProject["status"],
    audioStatus: AudioAsset["processingStatus"]
  ) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();

    await Promise.all([
      sql`
        update claim_projects
        set status = ${projectStatus}, updated_at = now()
        where tenant_id = ${this.tenantId}::uuid and id = ${projectId}
      `,
      sql`
        update audio_assets
        set processing_status = ${audioStatus}
        where tenant_id = ${this.tenantId}::uuid and id = ${audioAssetId}
      `
    ]);
  }

  async markProjectReadyForReview(projectId: string) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();

    await sql`
      update claim_projects
      set
        status = 'ready',
        review_flags = review_flags || '{"readyForReview":true,"needsSupervisorReview":true,"siuFlagged":true,"draftMemoReady":true,"supervisorApproved":false,"supervisorReturned":false}'::jsonb,
        updated_at = now()
      where tenant_id = ${this.tenantId}::uuid and id = ${projectId}
    `;
  }

  async saveTranscriptSegments(segments: TranscriptSegment[]) {
    if (segments.length === 0) {
      return;
    }

    await this.ensureDemoTenant();
    const sql = getNeonSql();

    await sql`
      insert into transcript_segments (
        id,
        tenant_id,
        audio_asset_id,
        speaker,
        text,
        start_time_seconds,
        end_time_seconds,
        confidence
      )
      select
        item.id,
        ${this.tenantId}::uuid,
        item."audioAssetId",
        item.speaker,
        item.text,
        item."startTimeSeconds",
        item."endTimeSeconds",
        item.confidence
      from jsonb_to_recordset(${JSON.stringify(segments)}::jsonb) as item(
        id text,
        "audioAssetId" text,
        speaker text,
        text text,
        "startTimeSeconds" numeric,
        "endTimeSeconds" numeric,
        confidence numeric
      )
      on conflict (id) do update set
        speaker = excluded.speaker,
        text = excluded.text,
        start_time_seconds = excluded.start_time_seconds,
        end_time_seconds = excluded.end_time_seconds,
        confidence = excluded.confidence
    `;
  }

  async saveAnalysisResult(input: SaveAnalysisResultInput) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();

    if (input.findings.length > 0) {
      await sql`
        insert into evidence_findings (
          id,
          tenant_id,
          audio_asset_id,
          category,
          title,
          speaker,
          exact_quote,
          start_time_seconds,
          end_time_seconds,
          confidence,
          severity,
          why_it_matters,
          recommended_follow_up,
          related_transcript_segment_ids,
          review_status,
          notes
        )
        select
          item.id,
          ${this.tenantId}::uuid,
          item."audioAssetId",
          item.category,
          item.title,
          item.speaker,
          item."exactQuote",
          item."startTimeSeconds",
          item."endTimeSeconds",
          item.confidence,
          item.severity,
          item."whyItMatters",
          item."recommendedFollowUp",
          item."relatedTranscriptSegmentIds",
          item."reviewStatus",
          item.notes
        from jsonb_to_recordset(${JSON.stringify(input.findings)}::jsonb) as item(
          id text,
          "audioAssetId" text,
          category text,
          title text,
          speaker text,
          "exactQuote" text,
          "startTimeSeconds" numeric,
          "endTimeSeconds" numeric,
          confidence numeric,
          severity text,
          "whyItMatters" text,
          "recommendedFollowUp" text,
          "relatedTranscriptSegmentIds" text[],
          "reviewStatus" text,
          notes text
        )
        on conflict (id) do update set
          category = excluded.category,
          title = excluded.title,
          speaker = excluded.speaker,
          exact_quote = excluded.exact_quote,
          start_time_seconds = excluded.start_time_seconds,
          end_time_seconds = excluded.end_time_seconds,
          confidence = excluded.confidence,
          severity = excluded.severity,
          why_it_matters = excluded.why_it_matters,
          recommended_follow_up = excluded.recommended_follow_up,
          related_transcript_segment_ids = excluded.related_transcript_segment_ids,
          review_status = excluded.review_status,
          notes = excluded.notes,
          updated_at = now()
      `;
    }

    if (input.contradictions.length > 0) {
      await sql`
        insert into contradictions (
          id,
          tenant_id,
          audio_asset_id,
          title,
          statement_a,
          statement_b,
          quote_a,
          quote_b,
          timestamp_a,
          timestamp_b,
          why_it_matters,
          review_status
        )
        select
          item.id,
          ${this.tenantId}::uuid,
          item."audioAssetId",
          item.title,
          item."statementA",
          item."statementB",
          item."quoteA",
          item."quoteB",
          item."timestampA",
          item."timestampB",
          item."whyItMatters",
          item."reviewStatus"
        from jsonb_to_recordset(${JSON.stringify(input.contradictions)}::jsonb) as item(
          id text,
          "audioAssetId" text,
          title text,
          "statementA" text,
          "statementB" text,
          "quoteA" text,
          "quoteB" text,
          "timestampA" numeric,
          "timestampB" numeric,
          "whyItMatters" text,
          "reviewStatus" text
        )
        on conflict (id) do update set
          title = excluded.title,
          statement_a = excluded.statement_a,
          statement_b = excluded.statement_b,
          quote_a = excluded.quote_a,
          quote_b = excluded.quote_b,
          timestamp_a = excluded.timestamp_a,
          timestamp_b = excluded.timestamp_b,
          why_it_matters = excluded.why_it_matters,
          review_status = excluded.review_status,
          updated_at = now()
      `;
    }

    if (input.clips.length > 0) {
      await sql`
        insert into evidence_clips (
          id,
          tenant_id,
          audio_asset_id,
          claim_project_id,
          title,
          start_time_seconds,
          end_time_seconds,
          transcript_excerpt,
          linked_finding_ids,
          created_by,
          created_at
        )
        select
          item.id,
          ${this.tenantId}::uuid,
          item."audioAssetId",
          item."claimProjectId",
          item.title,
          item."startTimeSeconds",
          item."endTimeSeconds",
          item."transcriptExcerpt",
          item."linkedFindingIds",
          item."createdBy",
          item."createdAt"
        from jsonb_to_recordset(${JSON.stringify(input.clips)}::jsonb) as item(
          id text,
          "audioAssetId" text,
          "claimProjectId" text,
          title text,
          "startTimeSeconds" numeric,
          "endTimeSeconds" numeric,
          "transcriptExcerpt" text,
          "linkedFindingIds" text[],
          "createdBy" text,
          "createdAt" timestamptz
        )
        on conflict (id) do update set
          title = excluded.title,
          start_time_seconds = excluded.start_time_seconds,
          end_time_seconds = excluded.end_time_seconds,
          transcript_excerpt = excluded.transcript_excerpt,
          linked_finding_ids = excluded.linked_finding_ids
      `;
    }

    if (input.exportMemos.length > 0) {
      await sql`
        insert into export_memos (
          id,
          tenant_id,
          claim_project_id,
          audio_asset_id,
          export_type,
          title,
          content,
          included_finding_ids,
          included_contradiction_ids,
          included_clip_ids,
          s3_export_key,
          created_at
        )
        select
          item.id,
          ${this.tenantId}::uuid,
          item."claimProjectId",
          item."audioAssetId",
          item."exportType",
          item.title,
          item.content,
          item."includedFindingIds",
          item."includedContradictionIds",
          item."includedClipIds",
          item."s3ExportKey",
          item."createdAt"
        from jsonb_to_recordset(${JSON.stringify(input.exportMemos)}::jsonb) as item(
          id text,
          "claimProjectId" text,
          "audioAssetId" text,
          "exportType" text,
          title text,
          content text,
          "includedFindingIds" text[],
          "includedContradictionIds" text[],
          "includedClipIds" text[],
          "s3ExportKey" text,
          "createdAt" timestamptz
        )
        on conflict (id) do update set
          title = excluded.title,
          content = excluded.content,
          included_finding_ids = excluded.included_finding_ids,
          included_contradiction_ids = excluded.included_contradiction_ids,
          included_clip_ids = excluded.included_clip_ids,
          s3_export_key = excluded.s3_export_key
      `;
    }
  }

  async updateFindingReviewStatus(findingId: string, reviewStatus: ReviewStatus) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();
    const rows = asRows(await sql`
      update evidence_findings
      set review_status = ${reviewStatus}, updated_at = now()
      where tenant_id = ${this.tenantId}::uuid and id = ${findingId}
      returning *
    `);

    return rows[0] ? mapFindingRow(rows[0]) : null;
  }

  async updateContradictionReviewStatus(contradictionId: string, reviewStatus: ReviewStatus) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();
    const rows = asRows(await sql`
      update contradictions
      set review_status = ${reviewStatus}, updated_at = now()
      where tenant_id = ${this.tenantId}::uuid and id = ${contradictionId}
      returning *
    `);

    return rows[0] ? mapContradictionRow(rows[0]) : null;
  }

  async editFinding(
    findingId: string,
    updates: Pick<EvidenceFinding, "title" | "whyItMatters" | "recommendedFollowUp" | "notes">
  ) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();
    const rows = asRows(await sql`
      update evidence_findings
      set
        title = ${updates.title},
        why_it_matters = ${updates.whyItMatters},
        recommended_follow_up = ${updates.recommendedFollowUp},
        notes = ${updates.notes},
        review_status = 'edited',
        updated_at = now()
      where tenant_id = ${this.tenantId}::uuid and id = ${findingId}
      returning *
    `);

    return rows[0] ? mapFindingRow(rows[0]) : null;
  }

  async createClip(clip: EvidenceClip) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();

    await sql`
      insert into evidence_clips (
        id,
        tenant_id,
        audio_asset_id,
        claim_project_id,
        title,
        start_time_seconds,
        end_time_seconds,
        transcript_excerpt,
        linked_finding_ids,
        created_by,
        created_at
      )
      values (
        ${clip.id},
        ${this.tenantId}::uuid,
        ${clip.audioAssetId},
        ${clip.claimProjectId},
        ${clip.title},
        ${clip.startTimeSeconds},
        ${clip.endTimeSeconds},
        ${clip.transcriptExcerpt},
        ${clip.linkedFindingIds},
        ${clip.createdBy},
        ${clip.createdAt}
      )
      on conflict (id) do update set
        title = excluded.title,
        start_time_seconds = excluded.start_time_seconds,
        end_time_seconds = excluded.end_time_seconds,
        transcript_excerpt = excluded.transcript_excerpt,
        linked_finding_ids = excluded.linked_finding_ids
    `;
  }

  async updateProjectReviewState(
    projectId: string,
    status: ClaimProject["status"],
    reviewFlags: Partial<ClaimProject["reviewFlags"]>
  ) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();
    const rows = asRows(await sql`
      update claim_projects
      set
        status = ${status},
        review_flags = review_flags || ${JSON.stringify(reviewFlags)}::jsonb,
        updated_at = now()
      where tenant_id = ${this.tenantId}::uuid and id = ${projectId}
      returning *
    `);

    return rows[0] ? mapProjectRow(rows[0]) : null;
  }

  async recordUserReviewAction(action: UserReviewAction) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();

    await sql`
      insert into user_review_actions (
        id,
        tenant_id,
        claim_project_id,
        audio_asset_id,
        target_type,
        target_id,
        action,
        previous_value,
        new_value,
        user_id,
        created_at
      )
      values (
        ${action.id},
        ${this.tenantId}::uuid,
        ${action.claimProjectId},
        ${action.audioAssetId},
        ${action.targetType},
        ${action.targetId},
        ${action.action},
        ${action.previousValue ? JSON.stringify(action.previousValue) : null}::jsonb,
        ${action.newValue ? JSON.stringify(action.newValue) : null}::jsonb,
        ${action.userId},
        ${action.createdAt}
      )
      on conflict (id) do nothing
    `;
  }

  async recordAuditEvent(event: AuditLogEvent) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();

    await sql`
      insert into audit_log_events (
        id,
        tenant_id,
        claim_project_id,
        audio_asset_id,
        event_type,
        actor,
        target_type,
        target_id,
        summary,
        metadata,
        created_at
      )
      values (
        ${event.id},
        ${this.tenantId}::uuid,
        ${event.claimProjectId || null},
        ${event.audioAssetId || null},
        ${event.eventType},
        ${event.actor},
        ${event.targetType},
        ${event.targetId},
        ${event.summary},
        ${event.metadata ? JSON.stringify(event.metadata) : null}::jsonb,
        ${event.createdAt}
      )
      on conflict (id) do nothing
    `;
  }

  async listAuditEvents(limit = 100) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();
    const rows = asRows(await sql`
      select *
      from audit_log_events
      where tenant_id = ${this.tenantId}::uuid
      order by created_at desc
      limit ${limit}
    `);

    return rows.map(mapAuditEventRow);
  }

  async insertExportMemo(memo: ExportMemo) {
    await this.ensureDemoTenant();
    const sql = getNeonSql();

    await sql`
      insert into export_memos (
        id,
        tenant_id,
        claim_project_id,
        audio_asset_id,
        export_type,
        title,
        content,
        included_finding_ids,
        included_contradiction_ids,
        included_clip_ids,
        s3_export_key,
        created_at
      )
      values (
        ${memo.id},
        ${this.tenantId}::uuid,
        ${memo.claimProjectId},
        ${memo.audioAssetId},
        ${memo.exportType},
        ${memo.title},
        ${memo.content},
        ${memo.includedFindingIds},
        ${memo.includedContradictionIds},
        ${memo.includedClipIds},
        ${memo.s3ExportKey || null},
        ${memo.createdAt}
      )
      on conflict (id) do update set
        title = excluded.title,
        content = excluded.content,
        included_finding_ids = excluded.included_finding_ids,
        included_contradiction_ids = excluded.included_contradiction_ids,
        included_clip_ids = excluded.included_clip_ids,
        s3_export_key = excluded.s3_export_key
    `;
  }
}

export function createClaimAudioRepository(tenantId?: string): ClaimAudioRepository {
  return new NeonClaimAudioRepository(tenantId);
}

function mapProjectRow(row: Record<string, unknown>): ClaimProject {
  const reviewFlags = toRecord(row.review_flags) as ClaimProject["reviewFlags"];

  return {
    id: String(row.id),
    claimNumber: String(row.claim_number),
    claimantName: String(row.claimant_name),
    insuredName: String(row.insured_name),
    lossDate: formatDate(row.loss_date),
    claimType: String(row.claim_type),
    lineOfBusiness: String(row.line_of_business),
    status: row.status as ClaimProject["status"],
    audioAssetId: String(row.audio_asset_id || ""),
    reviewFlags: {
      readyForReview: Boolean(reviewFlags.readyForReview),
      needsSupervisorReview: Boolean(reviewFlags.needsSupervisorReview),
      siuFlagged: Boolean(reviewFlags.siuFlagged),
      draftMemoReady: Boolean(reviewFlags.draftMemoReady),
      supervisorApproved: Boolean(reviewFlags.supervisorApproved),
      supervisorReturned: Boolean(reviewFlags.supervisorReturned)
    },
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at)
  };
}

function mapAudioAssetRow(row: Record<string, unknown>): AudioAsset {
  return {
    id: String(row.id),
    claimProjectId: String(row.claim_project_id),
    fileName: String(row.file_name),
    durationSeconds: toNumber(row.duration_seconds),
    sourceType: row.source_type as AudioAsset["sourceType"],
    processingStatus: row.processing_status as AudioAsset["processingStatus"],
    storageUrl: row.storage_url ? String(row.storage_url) : undefined,
    createdAt: formatDateTime(row.created_at)
  };
}

function mapTranscriptSegmentRow(row: Record<string, unknown>): TranscriptSegment {
  return {
    id: String(row.id),
    audioAssetId: String(row.audio_asset_id),
    speaker: row.speaker as TranscriptSegment["speaker"],
    text: String(row.text),
    startTimeSeconds: toNumber(row.start_time_seconds),
    endTimeSeconds: toNumber(row.end_time_seconds),
    confidence: toNumber(row.confidence)
  };
}

function mapFindingRow(row: Record<string, unknown>): EvidenceFinding {
  return {
    id: String(row.id),
    audioAssetId: String(row.audio_asset_id),
    category: row.category as EvidenceFinding["category"],
    title: String(row.title),
    speaker: String(row.speaker),
    exactQuote: String(row.exact_quote),
    startTimeSeconds: toNumber(row.start_time_seconds),
    endTimeSeconds: toNumber(row.end_time_seconds),
    confidence: toNumber(row.confidence),
    severity: row.severity as EvidenceFinding["severity"],
    whyItMatters: String(row.why_it_matters),
    recommendedFollowUp: String(row.recommended_follow_up),
    relatedTranscriptSegmentIds: toStringArray(row.related_transcript_segment_ids),
    reviewStatus: row.review_status as EvidenceFinding["reviewStatus"],
    notes: String(row.notes || "")
  };
}

function mapContradictionRow(row: Record<string, unknown>): Contradiction {
  return {
    id: String(row.id),
    audioAssetId: String(row.audio_asset_id),
    title: String(row.title),
    statementA: String(row.statement_a),
    statementB: String(row.statement_b),
    quoteA: String(row.quote_a),
    quoteB: String(row.quote_b),
    timestampA: toNumber(row.timestamp_a),
    timestampB: toNumber(row.timestamp_b),
    whyItMatters: String(row.why_it_matters),
    reviewStatus: row.review_status as Contradiction["reviewStatus"]
  };
}

function mapClipRow(row: Record<string, unknown>): EvidenceClip {
  return {
    id: String(row.id),
    audioAssetId: String(row.audio_asset_id),
    claimProjectId: String(row.claim_project_id),
    title: String(row.title),
    startTimeSeconds: toNumber(row.start_time_seconds),
    endTimeSeconds: toNumber(row.end_time_seconds),
    transcriptExcerpt: String(row.transcript_excerpt),
    linkedFindingIds: toStringArray(row.linked_finding_ids),
    createdBy: String(row.created_by),
    createdAt: formatDateTime(row.created_at)
  };
}

function mapExportMemoRow(row: Record<string, unknown>): ExportMemo {
  return {
    id: String(row.id),
    claimProjectId: String(row.claim_project_id),
    audioAssetId: String(row.audio_asset_id),
    exportType: row.export_type as ExportMemo["exportType"],
    title: String(row.title),
    content: String(row.content),
    includedFindingIds: toStringArray(row.included_finding_ids),
    includedContradictionIds: toStringArray(row.included_contradiction_ids),
    includedClipIds: toStringArray(row.included_clip_ids),
    s3ExportKey: row.s3_export_key ? String(row.s3_export_key) : undefined,
    createdAt: formatDateTime(row.created_at)
  };
}

function mapAuditEventRow(row: Record<string, unknown>): AuditLogEvent {
  return {
    id: String(row.id),
    claimProjectId: row.claim_project_id ? String(row.claim_project_id) : undefined,
    audioAssetId: row.audio_asset_id ? String(row.audio_asset_id) : undefined,
    eventType: row.event_type as AuditLogEvent["eventType"],
    actor: String(row.actor),
    targetType: row.target_type as AuditLogEvent["targetType"],
    targetId: String(row.target_id),
    summary: String(row.summary),
    metadata: row.metadata ? toRecord(row.metadata) : undefined,
    createdAt: formatDateTime(row.created_at)
  };
}

function formatDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function formatDateTime(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}
