import { validateEvidenceFindings, findForbiddenConclusionLanguage } from "@/lib/ai/validation";
import { mockContradictions, mockFindings } from "@/lib/mock-data";

function main() {
  const findingResult = validateEvidenceFindings(mockFindings);
  const contradictionIssues = mockContradictions.flatMap((contradiction, index) => {
    const issues: string[] = [];

    if (!contradiction.quoteA.trim()) {
      issues.push(`contradictions[${index}].quoteA is required.`);
    }

    if (!contradiction.quoteB.trim()) {
      issues.push(`contradictions[${index}].quoteB is required.`);
    }

    if (!Number.isFinite(contradiction.timestampA) || !Number.isFinite(contradiction.timestampB)) {
      issues.push(`contradictions[${index}] requires timestampA and timestampB.`);
    }

    if (!contradiction.whyItMatters.trim()) {
      issues.push(`contradictions[${index}].whyItMatters is required.`);
    }

    const forbidden = findForbiddenConclusionLanguage(contradiction);

    if (forbidden.length > 0) {
      issues.push(`contradictions[${index}] contains forbidden conclusion language: ${forbidden.join(", ")}.`);
    }

    return issues;
  });

  if (!findingResult.valid || contradictionIssues.length > 0) {
    console.error("AI guardrail validation failed.");

    findingResult.issues.forEach((issue) => {
      console.error(`- ${issue.path}: ${issue.message}`);
    });
    contradictionIssues.forEach((issue) => {
      console.error(`- ${issue}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(
    `AI guardrail validation passed: ${mockFindings.length} findings and ${mockContradictions.length} contradictions checked.`
  );
}

main();
