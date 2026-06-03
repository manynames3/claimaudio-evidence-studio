import {
  type ClaimPromptContext,
  type PromptTranscriptSegment,
  renderClaimContext,
  renderForbiddenLanguageInstruction,
  renderSafetyRules,
  renderTranscriptSegments
} from "@/lib/ai/prompts/shared";

export interface ContradictionDetectionPromptInput {
  claimContext?: ClaimPromptContext;
  currentStatementSegments: PromptTranscriptSegment[];
  comparisonStatementSegments?: PromptTranscriptSegment[];
  uploadedDocumentExcerpts?: Array<{
    id: string;
    sourceName: string;
    text: string;
  }>;
}

export function buildContradictionDetectionPrompt(input: ContradictionDetectionPromptInput) {
  return `You are ClaimAudio Evidence Studio's contradiction and inconsistency detection engine.

Your task is to identify potential inconsistencies that require human review. Compare:
- speaker statements within the same recording
- multiple statements in the same claim
- first statement vs later statement
- claimant vs insured vs witness
- statement vs uploaded documents when document excerpts are provided later

AI safety and evidence rules:
${renderSafetyRules()}

${renderForbiddenLanguageInstruction()}

Never say someone lied. Never say a claim is fraudulent. Use neutral phrasing such as "potential inconsistency," "possible credibility issue," or "requires review."

Claim context:
${renderClaimContext(input.claimContext)}

Current recorded statement transcript:
${renderTranscriptSegments(input.currentStatementSegments)}

Comparison statement transcript:
${input.comparisonStatementSegments?.length ? renderTranscriptSegments(input.comparisonStatementSegments) : "No comparison statement provided."}

Uploaded document excerpts:
${input.uploadedDocumentExcerpts?.length ? input.uploadedDocumentExcerpts.map((doc) => `[${doc.id}] ${doc.sourceName}: ${doc.text}`).join("\n") : "No uploaded document excerpts provided."}

Return strict JSON only. Do not include markdown or commentary.

Required JSON schema:
{
  "contradictions": [
    {
      "title": "",
      "statementA": "",
      "statementB": "",
      "quoteA": "",
      "quoteB": "",
      "timestampA": 0,
      "timestampB": 0,
      "sourceAId": "",
      "sourceBId": "",
      "whyItMatters": "",
      "reviewStatus": "pending"
    }
  ]
}

If either side lacks exact quote support, omit the contradiction. If there is not enough support, return:
{
  "contradictions": []
}`;
}

export const contradictionDetectionSystemPrompt = `Detect only quote-supported potential inconsistencies. Avoid final fraud, fault, or denial conclusions.`;
