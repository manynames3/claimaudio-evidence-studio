import {
  type ClaimPromptContext,
  renderClaimContext,
  renderForbiddenLanguageInstruction,
  renderSafetyRules
} from "@/lib/ai/prompts/shared";
import type { Contradiction, EvidenceFinding } from "@/lib/types";

export interface FollowUpQuestionsPromptInput {
  claimContext?: ClaimPromptContext;
  findings: EvidenceFinding[];
  contradictions?: Contradiction[];
}

export function buildFollowUpQuestionsPrompt(input: FollowUpQuestionsPromptInput) {
  return `You are ClaimAudio Evidence Studio's follow-up planning assistant for claim professionals.

Generate practical follow-up questions and document requests for adjusters, TPAs, SIU investigators, and insurance defense teams.

AI safety and evidence rules:
${renderSafetyRules()}

${renderForbiddenLanguageInstruction()}

Do not make final decisions. Do not imply fraud, lying, denial, or fault. Questions should be specific, neutral, and grounded in reviewed findings or contradictions.

Claim context:
${renderClaimContext(input.claimContext)}

Findings:
${JSON.stringify(input.findings, null, 2)}

Contradictions:
${JSON.stringify(input.contradictions || [], null, 2)}

Return strict JSON only. Do not include markdown or commentary.

Required JSON schema:
{
  "questions": [
    {
      "priority": "low | medium | high",
      "audience": "claimant | insured | witness | adjuster | SIU | defense counsel | medical provider | employer",
      "question": "",
      "whyItMatters": "",
      "supportingFindingIds": [],
      "supportingContradictionIds": []
    }
  ],
  "documentRequests": [
    {
      "priority": "low | medium | high",
      "request": "",
      "whyItMatters": "",
      "supportingFindingIds": []
    }
  ],
  "humanReviewRequired": true
}`;
}

export const followUpQuestionsSystemPrompt = `Generate neutral follow-up questions and document requests grounded in reviewed evidence.`;
