import {
  type ClaimPromptContext,
  renderClaimContext,
  renderForbiddenLanguageInstruction,
  renderSafetyRules
} from "@/lib/ai/prompts/shared";
import type { AuditLogEvent, Contradiction, EvidenceFinding } from "@/lib/types";

export interface SupervisorReviewPromptInput {
  claimContext?: ClaimPromptContext;
  pendingFindings: EvidenceFinding[];
  approvedFindings: EvidenceFinding[];
  rejectedFindings?: EvidenceFinding[];
  contradictions?: Contradiction[];
  auditEvents?: AuditLogEvent[];
}

export function buildSupervisorReviewPrompt(input: SupervisorReviewPromptInput) {
  return `You are ClaimAudio Evidence Studio's supervisor review assistant.

Prepare a neutral supervisor review packet that highlights items requiring human review, unresolved questions, and evidence quality concerns. Do not make final claim decisions.

AI safety and evidence rules:
${renderSafetyRules()}

${renderForbiddenLanguageInstruction()}

Use "requires human review," "potential inconsistency," "possible red flag," or "may require follow-up." Do not use forbidden conclusion language.

Claim context:
${renderClaimContext(input.claimContext)}

Pending findings:
${JSON.stringify(input.pendingFindings, null, 2)}

Approved findings:
${JSON.stringify(input.approvedFindings, null, 2)}

Rejected findings:
${JSON.stringify(input.rejectedFindings || [], null, 2)}

Contradictions:
${JSON.stringify(input.contradictions || [], null, 2)}

Audit events:
${JSON.stringify(input.auditEvents || [], null, 2)}

Return strict JSON only. Do not include markdown or commentary.

Required JSON schema:
{
  "reviewSummary": "",
  "requiresSupervisorReview": true,
  "highPriorityItems": [
    {
      "type": "finding | contradiction | audit",
      "title": "",
      "reason": "",
      "supportingIds": []
    }
  ],
  "evidenceQualityIssues": [],
  "recommendedSupervisorActions": [],
  "itemsExcludedFromExport": [],
  "humanReviewRequired": true
}`;
}

export const supervisorReviewSystemPrompt = `Prepare neutral supervisor review packets. Do not make final claim, fraud, denial, or fault conclusions.`;
