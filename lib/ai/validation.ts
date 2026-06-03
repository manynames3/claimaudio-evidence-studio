import {
  evidenceCategoryValues,
  forbiddenConclusionLanguage
} from "@/lib/ai/prompts/shared";
import type { EvidenceCategory, EvidenceFinding } from "@/lib/types";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export type EvidenceFindingCandidate = Partial<
  Pick<
    EvidenceFinding,
    | "category"
    | "title"
    | "speaker"
    | "exactQuote"
    | "startTimeSeconds"
    | "endTimeSeconds"
    | "confidence"
    | "severity"
    | "whyItMatters"
    | "recommendedFollowUp"
    | "relatedTranscriptSegmentIds"
  >
>;

export function validateEvidenceFindings(findings: EvidenceFindingCandidate[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  findings.forEach((finding, index) => {
    const path = `findings[${index}]`;

    if (!finding.category) {
      issues.push({ path: `${path}.category`, message: "Finding must include a category." });
    } else if (!isEvidenceCategory(finding.category)) {
      issues.push({ path: `${path}.category`, message: `Unsupported category: ${finding.category}.` });
    }

    if (!finding.exactQuote?.trim()) {
      issues.push({ path: `${path}.exactQuote`, message: "Finding must include an exact quote." });
    }

    if (!Number.isFinite(finding.startTimeSeconds) || !Number.isFinite(finding.endTimeSeconds)) {
      issues.push({ path: `${path}.timestamp`, message: "Finding must include start and end timestamps." });
    } else if ((finding.startTimeSeconds ?? 0) > (finding.endTimeSeconds ?? 0)) {
      issues.push({ path: `${path}.timestamp`, message: "Finding start timestamp must be before end timestamp." });
    }

    if (typeof finding.confidence !== "number" || Number.isNaN(finding.confidence)) {
      issues.push({ path: `${path}.confidence`, message: "Finding must include numeric confidence." });
    } else if (finding.confidence < 0 || finding.confidence > 1) {
      issues.push({ path: `${path}.confidence`, message: "Finding confidence must be between 0 and 1." });
    }

    if (!finding.whyItMatters?.trim()) {
      issues.push({ path: `${path}.whyItMatters`, message: "Finding must include whyItMatters." });
    }

    if (!finding.relatedTranscriptSegmentIds?.length) {
      issues.push({
        path: `${path}.relatedTranscriptSegmentIds`,
        message: "Finding must link to at least one transcript segment."
      });
    }

    const forbiddenLanguageIssues = findForbiddenConclusionLanguage(finding);
    issues.push(
      ...forbiddenLanguageIssues.map((phrase) => ({
        path,
        message: `Forbidden conclusion language appears: "${phrase}".`
      }))
    );
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

export function assertValidEvidenceFindings(findings: EvidenceFindingCandidate[]) {
  const result = validateEvidenceFindings(findings);

  if (!result.valid) {
    throw new Error(
      `Invalid evidence findings:\n${result.issues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`
    );
  }
}

export function containsForbiddenConclusionLanguage(value: unknown): boolean {
  return findForbiddenConclusionLanguage(value).length > 0;
}

export function findForbiddenConclusionLanguage(value: unknown): string[] {
  const text = collectText(value).toLowerCase();

  return forbiddenConclusionLanguage.filter((phrase) => text.includes(phrase));
}

function isEvidenceCategory(value: unknown): value is EvidenceCategory {
  return typeof value === "string" && evidenceCategoryValues.includes(value as EvidenceCategory);
}

function collectText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(collectText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(collectText).join(" ");
  }

  return "";
}
