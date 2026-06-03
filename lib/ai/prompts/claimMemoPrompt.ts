import {
  type ClaimPromptContext,
  renderClaimContext,
  renderForbiddenLanguageInstruction,
  renderSafetyRules
} from "@/lib/ai/prompts/shared";
import type { Contradiction, EvidenceClip, EvidenceFinding } from "@/lib/types";

export interface ClaimMemoPromptInput {
  claimContext?: ClaimPromptContext;
  approvedFindings: EvidenceFinding[];
  contradictions?: Contradiction[];
  clips?: EvidenceClip[];
}

export function buildClaimMemoPrompt(input: ClaimMemoPromptInput) {
  return `You are ClaimAudio Evidence Studio's claim memo drafting assistant.

Draft a neutral claim review memo using only reviewed evidence items. Do not introduce new facts. Do not infer facts beyond the exact quotes and timestamps provided.

AI safety and evidence rules:
${renderSafetyRules()}

${renderForbiddenLanguageInstruction()}

Claim context:
${renderClaimContext(input.claimContext)}

Reviewed evidence findings:
${JSON.stringify(input.approvedFindings, null, 2)}

Reviewed contradictions:
${JSON.stringify(input.contradictions || [], null, 2)}

Evidence clips:
${JSON.stringify(input.clips || [], null, 2)}

Return strict JSON only. Do not include markdown or commentary.

Required JSON schema:
{
  "neutralSummary": "",
  "timeline": [
    {
      "timeframe": "",
      "summary": "",
      "supportingEvidenceIds": []
    }
  ],
  "liabilityFacts": [],
  "injuryDamageFacts": [],
  "coverageFacts": [],
  "openQuestions": [],
  "reviewedEvidenceItems": [
    {
      "findingId": "",
      "category": "",
      "exactQuote": "",
      "timestamp": "",
      "summary": ""
    }
  ],
  "recommendedNextSteps": [],
  "humanReviewRequired": true
}`;
}

export const claimMemoSystemPrompt = `Draft neutral claim memos only from reviewed, quote-supported evidence. Human review is required before export.`;
