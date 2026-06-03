import {
  type ClaimPromptContext,
  type PromptTranscriptSegment,
  evidenceCategoryValues,
  renderClaimContext,
  renderForbiddenLanguageInstruction,
  renderSafetyRules,
  renderTranscriptSegments
} from "@/lib/ai/prompts/shared";

export interface EvidenceExtractionPromptInput {
  claimContext?: ClaimPromptContext;
  transcriptSegments: PromptTranscriptSegment[];
}

export function buildEvidenceExtractionPrompt(input: EvidenceExtractionPromptInput) {
  return `You are ClaimAudio Evidence Studio's insurance recorded statement evidence extraction engine.

Your task is to identify claim-relevant evidence from an auto bodily injury or liability recorded statement.

AI safety and evidence rules:
${renderSafetyRules()}

${renderForbiddenLanguageInstruction()}

Permitted categories:
${evidenceCategoryValues.join(" | ")}

Claim context:
${renderClaimContext(input.claimContext)}

Transcript segments:
${renderTranscriptSegments(input.transcriptSegments)}

Return strict JSON only. Do not include markdown, commentary, prose, or trailing commas.

If no supported findings exist, return:
{
  "findings": []
}

For every candidate finding, verify that exactQuote appears verbatim in the transcript segment text and that startTimeSeconds/endTimeSeconds align to the quoted segment. If support is missing, do not include the finding; use "insufficient evidence" only inside internal reasoning, never as an unsupported finding.

Required JSON schema:
{
  "findings": [
    {
      "category": "Liability | Injury | Damages | Prior Condition | Timeline | Coverage | Credibility | SIU Flag | Follow-up",
      "title": "",
      "speaker": "",
      "exactQuote": "",
      "startTimeSeconds": 0,
      "endTimeSeconds": 0,
      "confidence": 0.0,
      "severity": "low | medium | high",
      "whyItMatters": "",
      "recommendedFollowUp": "",
      "relatedTranscriptSegmentIds": []
    }
  ]
}`;
}

export const evidenceExtractionSystemPrompt = `Extract timestamped claim evidence only when the transcript provides exact quote support. Never invent facts. Human review is required before export.`;
