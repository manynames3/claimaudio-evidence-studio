import type { EvidenceCategory } from "@/lib/types";

export const evidenceCategoryValues: EvidenceCategory[] = [
  "Liability",
  "Injury",
  "Damages",
  "Prior Condition",
  "Timeline",
  "Coverage",
  "Credibility",
  "SIU Flag",
  "Follow-up"
];

export const forbiddenConclusionLanguage = [
  "fraudulent claim",
  "claimant is lying",
  "deny the claim",
  "insured is at fault",
  "claimant is exaggerating"
] as const;

export const preferredReviewLanguage = [
  "potential inconsistency",
  "may require follow-up",
  "possible credibility issue",
  "possible liability factor",
  "requires human review"
] as const;

export const aiSafetyRules = [
  "Never invent facts.",
  "Every evidence finding must cite an exact quote and timestamp range from the transcript.",
  "If the transcript does not support a finding, return \"insufficient evidence\" for that item instead of guessing.",
  "Do not say someone is lying.",
  "Do not say a claim is fraudulent.",
  "Do not make final coverage, liability, compensability, or claim-denial conclusions.",
  "Use neutral review language such as \"potential inconsistency,\" \"requires review,\" or \"possible red flag.\"",
  "Human review is required before any finding, memo, clip, or export is relied on.",
  "Findings should be useful to adjusters, TPAs, SIU investigators, insurance defense paralegals, and insurance defense attorneys."
] as const;

export interface PromptTranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
}

export interface ClaimPromptContext {
  claimNumber?: string;
  claimType?: string;
  lineOfBusiness?: string;
  jurisdiction?: string;
  claimantName?: string;
  insuredName?: string;
  lossDate?: string;
}

export function renderSafetyRules() {
  return aiSafetyRules.map((rule) => `- ${rule}`).join("\n");
}

export function renderTranscriptSegments(segments: PromptTranscriptSegment[]) {
  return segments
    .map(
      (segment) =>
        `[${segment.id}] ${segment.speaker} (${segment.startTimeSeconds}-${segment.endTimeSeconds}s): ${segment.text}`
    )
    .join("\n");
}

export function renderClaimContext(context?: ClaimPromptContext) {
  if (!context) {
    return "No additional claim context provided.";
  }

  return [
    ["Claim number", context.claimNumber],
    ["Claim type", context.claimType],
    ["Line of business", context.lineOfBusiness],
    ["Jurisdiction", context.jurisdiction],
    ["Claimant", context.claimantName],
    ["Insured", context.insuredName],
    ["Loss date", context.lossDate]
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

export function renderForbiddenLanguageInstruction() {
  return [
    "Forbidden conclusion language:",
    ...forbiddenConclusionLanguage.map((phrase) => `- ${phrase}`),
    "",
    "Use review language instead:",
    ...preferredReviewLanguage.map((phrase) => `- ${phrase}`)
  ].join("\n");
}
