import { createClaimAudioRepository } from "@/lib/db/claim-audio-repository";
import { mockAuditEvents } from "@/lib/mock-data";
import { jsonError, jsonOk, requireAuth } from "@/lib/server/api";
import { getRuntimeBackendStatus } from "@/lib/server/env";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  const status = getRuntimeBackendStatus();
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 100);

  if (!status.neonConfigured) {
    return jsonOk({
      backend: status,
      mode: "mock-readonly",
      auditEvents: mockAuditEvents.slice(0, limit)
    });
  }

  try {
    const repository = createClaimAudioRepository(authResult.auth.tenantId);
    const auditEvents = await repository.listAuditEvents(limit);

    return jsonOk({
      backend: status,
      mode: "neon",
      auditEvents
    });
  } catch (error) {
    return jsonError("Failed to load audit events from Neon.", 500, error instanceof Error ? error.message : error);
  }
}
