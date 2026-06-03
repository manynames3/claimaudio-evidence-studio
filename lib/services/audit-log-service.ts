import type { AuditEventType, AuditLogEvent } from "@/lib/types";

export interface RecordAuditEventInput {
  claimProjectId?: string;
  audioAssetId?: string;
  eventType: AuditEventType;
  actor?: string;
  targetType: AuditLogEvent["targetType"];
  targetId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogService {
  recordEvent(input: RecordAuditEventInput): Promise<AuditLogEvent>;
}

export const mockAuditLogService: AuditLogService = {
  async recordEvent(input) {
    // TODO: Production implementation should insert an immutable row into an audit trail table in RDS Postgres.
    // TODO: Stream operational events and errors to CloudWatch Logs with tenant/project correlation IDs.
    return {
      id: `audit-${crypto.randomUUID()}`,
      claimProjectId: input.claimProjectId,
      audioAssetId: input.audioAssetId,
      eventType: input.eventType,
      actor: input.actor || "Demo Reviewer",
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      metadata: input.metadata,
      createdAt: new Date().toISOString()
    };
  }
};

export const auditLogService = mockAuditLogService;
