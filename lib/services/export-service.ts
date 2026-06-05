import { formatTimeRange } from "@/lib/utils/time";
import type {
  ClaimProject,
  Contradiction,
  EvidenceClip,
  EvidenceFinding,
  ExportMemo,
  GeneratedExport,
  TranscriptSegment
} from "@/lib/types";

export interface GenerateExportInput {
  project: ClaimProject;
  findings: EvidenceFinding[];
  transcriptSegments: TranscriptSegment[];
  contradictions: Contradiction[];
  clips: EvidenceClip[];
  exportType: ExportMemo["exportType"];
  reviewer?: ExportReviewer;
}

export interface ExportService {
  generateExport(input: GenerateExportInput): Promise<GeneratedExport>;
}

export interface ExportReviewer {
  displayName: string;
  email: string;
  role: string;
  userId?: string;
  tenantId?: string;
}

export function buildMockExport(input: GenerateExportInput): GeneratedExport {
  const { project, exportType } = input;

  if (exportType === "statementSummary") {
    return {
      exportType,
      title: "Statement Summary",
      description: "Concise claim-facing summary of the recorded statement and primary evidence themes.",
      format: "HTML",
      fileName: `${project.claimNumber}_statement_summary.html`,
      content: buildStatementSummary(input)
    };
  }

  if (exportType === "timestampedEvidenceMemo") {
    return {
      exportType,
      title: "Timestamped Evidence Memo",
      description: "Approved evidence items grouped by category with exact quote, timestamp, and reviewer notes.",
      format: "HTML",
      fileName: `${project.claimNumber}_timestamped_evidence_memo.html`,
      content: buildEvidenceMemo(input)
    };
  }

  if (exportType === "contradictionReport") {
    return {
      exportType,
      title: "Contradiction Report",
      description: "Quote-paired contradiction review for SIU, credibility, and liability analysis.",
      format: "HTML",
      fileName: `${project.claimNumber}_contradiction_report.html`,
      content: buildContradictionHtml(input)
    };
  }

  if (exportType === "transcript") {
    return {
      exportType,
      title: "Transcript",
      description: "Full timestamped transcript with speaker labels and confidence references.",
      format: "Text",
      fileName: `${project.claimNumber}_transcript.txt`,
      content: buildTranscript(input)
    };
  }

  return {
    exportType,
    title: "Supervisor Review Packet",
    description: "Claim-file review packet with evidence status, pending issues, contradictions, and saved clips.",
    format: "HTML",
    fileName: `${project.claimNumber}_supervisor_review_packet.html`,
    content: buildSupervisorPacket(input)
  };
}

export const mockExportService: ExportService = {
  async generateExport(input) {
    // TODO: Production implementation should generate PDF/DOCX/HTML artifacts server-side.
    // TODO: Store exports in encrypted S3, log export generation, and return signed download URLs.
    return buildMockExport(input);
  }
};

export const exportService = mockExportService;

function buildStatementSummary(input: GenerateExportInput) {
  const { project, findings } = input;
  const approved = findings.filter((finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited");
  const pendingHigh = findings.filter((finding) => finding.reviewStatus === "pending" && finding.severity === "high");

  return buildClaimFileHtml({
    project,
    reviewer: input.reviewer,
    title: "Statement Summary",
    subtitle: "Neutral recorded-statement summary prepared from reviewer-approved evidence.",
    metadata: [
      { label: "Reviewed evidence", value: `${approved.length}` },
      { label: "Pending high-priority items", value: `${pendingHigh.length}` },
      { label: "Review status", value: project.reviewFlags.supervisorApproved ? "Supervisor approved" : "Human review required" }
    ],
    body: `
      <section>
        <h2>Approved Evidence Themes</h2>
        ${
          approved.length
            ? `<ul>${approved
                .map(
                  (finding) =>
                    `<li><strong>${escapeHtml(finding.category)}:</strong> ${escapeHtml(finding.title)} <span class="time">${escapeHtml(formatTimeRange(finding.startTimeSeconds, finding.endTimeSeconds))}</span></li>`
                )
                .join("")}</ul>`
            : `<p class="muted">No approved evidence items have been selected.</p>`
        }
      </section>
      <section>
        <h2>High-Priority Pending Items</h2>
        ${
          pendingHigh.length
            ? pendingHigh
                .map(
                  (finding) => `<article class="evidence-row">
                    <div><strong>${escapeHtml(finding.category)}:</strong> ${escapeHtml(finding.title)}</div>
                    <blockquote>${escapeHtml(finding.exactQuote)}</blockquote>
                  </article>`
                )
                .join("")
            : `<p class="muted">No high-severity pending items remain in this export scope.</p>`
        }
      </section>`
  });
}

function buildEvidenceMemo(input: GenerateExportInput) {
  const { project, findings } = input;
  const includedFindings = findings.filter((finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited");

  return buildClaimFileHtml({
    project,
    reviewer: input.reviewer,
    title: "Timestamped Evidence Memo",
    subtitle: "Reviewer-approved evidence with exact quote and timestamp support.",
    metadata: [
      { label: "Included evidence items", value: `${includedFindings.length}` },
      { label: "Pending findings excluded", value: `${findings.filter((finding) => finding.reviewStatus === "pending").length}` },
      { label: "Review status", value: project.reviewFlags.supervisorApproved ? "Supervisor approved" : "Reviewer approved only" }
    ],
    body: `
      <section>
        <h2>Neutral Summary</h2>
        <p>${
          includedFindings.length
            ? `The reviewed statement contains ${includedFindings.length} approved evidence items with exact quote and timestamp support. Key themes include ${escapeHtml(Array.from(new Set(includedFindings.map((finding) => finding.category))).join(", "))}.`
            : "No approved evidence items have been selected yet."
        }</p>
      </section>
      <section>
        <h2>Reviewed Evidence Items</h2>
        ${
          includedFindings.length
            ? includedFindings
                .map(
                  (finding) => `<article class="evidence-row">
                    <div class="row-head">
                      <span class="badge">${escapeHtml(finding.category)}</span>
                      <strong>${escapeHtml(finding.title)}</strong>
                      <span class="time">${escapeHtml(formatTimeRange(finding.startTimeSeconds, finding.endTimeSeconds))}</span>
                    </div>
                    <dl>
                      <dt>Speaker</dt><dd>${escapeHtml(finding.speaker)}</dd>
                      <dt>Quote</dt><dd><blockquote>${escapeHtml(finding.exactQuote)}</blockquote></dd>
                      <dt>Confidence</dt><dd>${escapeHtml(`${Math.round(finding.confidence * 100)}%`)} AI confidence; human review status: ${escapeHtml(finding.reviewStatus)}</dd>
                      <dt>Why it matters</dt><dd>${escapeHtml(finding.whyItMatters)}</dd>
                      <dt>Recommended follow-up</dt><dd>${escapeHtml(finding.recommendedFollowUp)}</dd>
                      <dt>Reviewer notes</dt><dd>${escapeHtml(finding.notes || "None")}</dd>
                    </dl>
                  </article>`
                )
                .join("")
            : `<p class="muted">No reviewed evidence items are available for this memo.</p>`
        }
      </section>
      <section>
        <h2>Recommended Next Steps</h2>
        ${
          includedFindings.length
            ? `<ul>${includedFindings
                .slice(0, 6)
                .map((finding) => `<li>${escapeHtml(finding.recommendedFollowUp)}</li>`)
                .join("")}</ul>`
            : `<p class="muted">Approve evidence items to generate next steps.</p>`
        }
      </section>
      <section>
        <h2>Open Questions</h2>
        ${
          findings.filter((finding) => finding.reviewStatus === "pending").length
            ? `<ul>${findings
                .filter((finding) => finding.reviewStatus === "pending")
                .slice(0, 5)
                .map(
                  (finding) =>
                    `<li>Requires human review: ${escapeHtml(finding.title)} <span class="time">${escapeHtml(formatTimeRange(finding.startTimeSeconds, finding.endTimeSeconds))}</span></li>`
                )
                .join("")}</ul>`
            : `<p class="muted">No pending finding questions are included in this export scope.</p>`
        }
      </section>`
  });
}

function buildClaimFileHtml(input: {
  project: ClaimProject;
  reviewer?: ExportReviewer;
  title: string;
  subtitle: string;
  metadata?: Array<{ label: string; value: string }>;
  body: string;
}) {
  const { project, reviewer, title, subtitle, body, metadata = [] } = input;
  const preparedAt = new Date().toISOString();
  const reviewerMetadata = getReviewerMetadata(reviewer, preparedAt);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(project.claimNumber)} ${escapeHtml(title)}</title>
  <style>
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; line-height: 1.5; }
    main { max-width: 960px; margin: 0 auto; padding: 32px; }
    header, section { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin-bottom: 16px; }
    header { border-top: 5px solid #155e75; }
    h1 { margin: 0; font-size: 24px; letter-spacing: 0; }
    h2 { margin: 0 0 12px; font-size: 15px; text-transform: uppercase; color: #334155; letter-spacing: 0; }
    p, li, dd { font-size: 14px; }
    .subtitle, .muted, .review-note { color: #475569; }
    .document-label { color: #155e75; font-size: 12px; font-weight: 700; letter-spacing: .04em; margin-bottom: 6px; text-transform: uppercase; }
    .claim-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
    .claim-grid div { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #f8fafc; }
    .signature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .signature-line { border-bottom: 1px solid #64748b; min-height: 34px; padding-top: 12px; font-weight: 700; }
    .fine-print { color: #64748b; font-size: 12px; line-height: 1.55; }
    .label { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .evidence-row { border-top: 1px solid #e2e8f0; padding: 14px 0; }
    .evidence-row:first-child { border-top: 0; }
    .row-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
    .badge { display: inline-flex; border-radius: 5px; background: #ecfeff; color: #155e75; padding: 3px 7px; font-size: 12px; font-weight: 700; }
    .time { color: #155e75; font-weight: 700; white-space: nowrap; }
    blockquote { margin: 6px 0; border-left: 4px solid #155e75; background: #f8fafc; padding: 8px 10px; color: #334155; }
    dl { display: grid; grid-template-columns: 150px 1fr; gap: 8px 12px; margin: 0; }
    dt { color: #64748b; font-size: 12px; text-transform: uppercase; }
    dd { margin: 0; }
    .review-note { border-left: 4px solid #ca8a04; background: #fefce8; padding: 10px 12px; margin-top: 14px; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="document-label">ClaimAudio Evidence Studio | Claim-file work product</div>
      <h1>${escapeHtml(title)} - ${escapeHtml(project.claimNumber)}</h1>
      <p class="subtitle">${escapeHtml(subtitle)}</p>
      <div class="claim-grid">
        <div><span class="label">Claimant</span>${escapeHtml(project.claimantName)}</div>
        <div><span class="label">Insured</span>${escapeHtml(project.insuredName)}</div>
        <div><span class="label">Loss date</span>${escapeHtml(project.lossDate)}</div>
        <div><span class="label">Claim type</span>${escapeHtml(project.claimType)}</div>
        <div><span class="label">Prepared</span>${escapeHtml(preparedAt)}</div>
        <div><span class="label">Reviewed by</span>${escapeHtml(reviewerMetadata.displayName)}</div>
        <div><span class="label">Reviewer role</span>${escapeHtml(reviewerMetadata.role)}</div>
        <div><span class="label">Reviewer email</span>${escapeHtml(reviewerMetadata.email)}</div>
        <div><span class="label">Tenant scope</span>${escapeHtml(reviewerMetadata.tenantId)}</div>
        ${metadata
          .map((item) => `<div><span class="label">${escapeHtml(item.label)}</span>${escapeHtml(item.value)}</div>`)
          .join("")}
      </div>
      <p class="review-note">AI-assisted work product. Human review is required before claim-file reliance. No coverage, liability, or claim disposition conclusion is made by this export.</p>
    </header>
    ${body}
    <section>
      <h2>Reviewer Attestation and Signature Metadata</h2>
      <p class="fine-print">This export is prepared as AI-assisted claim-review work product. The reviewer attests that exported findings marked approved or edited were checked against the cited quote and timestamp before use. This document does not decide coverage, liability, damages, or claim disposition.</p>
      <div class="signature-grid">
        <div>
          <span class="label">Electronic reviewer signature</span>
          <div class="signature-line">${escapeHtml(reviewerMetadata.displayName)}</div>
        </div>
        <div>
          <span class="label">Signed date</span>
          <div class="signature-line">${escapeHtml(reviewerMetadata.signedAt)}</div>
        </div>
        <div>
          <span class="label">Reviewer user ID</span>
          <div class="signature-line">${escapeHtml(reviewerMetadata.userId)}</div>
        </div>
        <div>
          <span class="label">Review system</span>
          <div class="signature-line">ClaimAudio Evidence Studio</div>
        </div>
      </div>
      <p class="fine-print">TODO: Production PDF/DOCX generation should attach immutable audit-event IDs, S3/KMS object metadata, customer retention label, and Cognito/Auth0-verified identity claims.</p>
    </section>
  </main>
</body>
</html>`;
}

function getReviewerMetadata(reviewer: ExportReviewer | undefined, signedAt: string) {
  return {
    displayName: reviewer?.displayName || "Pilot Reviewer",
    email: reviewer?.email || "pilot-reviewer@claimaudio.local",
    role: reviewer?.role ? reviewer.role.replace("_", " ") : "pilot reviewer",
    userId: reviewer?.userId || "local-demo-user",
    tenantId: reviewer?.tenantId || "local-demo-tenant",
    signedAt
  };
}

function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildContradictionHtml(input: GenerateExportInput) {
  const { project, contradictions } = input;

  return buildClaimFileHtml({
    project,
    reviewer: input.reviewer,
    title: "Contradiction Report",
    subtitle:
      "Quote-paired potential inconsistencies for human review. No fraud, liability, coverage, or disposition conclusion is made.",
    metadata: [
      { label: "Reviewed contradiction pairs", value: `${contradictions.length}` },
      { label: "Review status", value: project.reviewFlags.supervisorApproved ? "Supervisor approved" : "Human review required" }
    ],
    body:
      contradictions.length > 0
        ? `<section>
            <h2>Reviewed Potential Inconsistencies</h2>
            ${contradictions
              .map(
                (contradiction) => `<article class="evidence-row">
                  <div class="row-head">
                    <span class="badge">Potential inconsistency</span>
                    <strong>${escapeHtml(contradiction.title)}</strong>
                  </div>
                  <dl>
                    <dt>Why it matters</dt><dd>${escapeHtml(contradiction.whyItMatters)}</dd>
                    <dt>Statement A</dt><dd>${escapeHtml(contradiction.statementA)}</dd>
                    <dt>Quote A</dt><dd><blockquote>${escapeHtml(contradiction.quoteA)} <span class="time">${escapeHtml(formatTimeRange(contradiction.timestampA, contradiction.timestampA + 8))}</span></blockquote></dd>
                    <dt>Statement B</dt><dd>${escapeHtml(contradiction.statementB)}</dd>
                    <dt>Quote B</dt><dd><blockquote>${escapeHtml(contradiction.quoteB)} <span class="time">${escapeHtml(formatTimeRange(contradiction.timestampB, contradiction.timestampB + 8))}</span></blockquote></dd>
                  </dl>
                </article>`
              )
              .join("")}
          </section>`
        : `<section><h2>No Quote-Supported Contradictions</h2><p class="muted">No reviewed contradiction pairs are available for this statement.</p></section>`
  });
}

function buildTranscript(input: GenerateExportInput) {
  const { project, transcriptSegments } = input;
  const preparedAt = new Date().toISOString();
  const reviewerMetadata = getReviewerMetadata(input.reviewer, preparedAt);

  return [
    `Transcript - ${project.claimNumber}`,
    `Prepared: ${preparedAt}`,
    `Reviewed by: ${reviewerMetadata.displayName} (${reviewerMetadata.role})`,
    `Reviewer email: ${reviewerMetadata.email}`,
    `Tenant scope: ${reviewerMetadata.tenantId}`,
    `Signature metadata: ${reviewerMetadata.userId} at ${reviewerMetadata.signedAt}`,
    "Use condition: Human review required before claim-file reliance. This transcript does not decide coverage, liability, damages, or claim disposition.",
    "",
    ...transcriptSegments.map(
      (segment) =>
        `[${formatTimeRange(segment.startTimeSeconds, segment.endTimeSeconds)}] ${segment.speaker}: ${segment.text}`
    )
  ].join("\n");
}

function buildSupervisorPacket(input: GenerateExportInput) {
  const { project, findings, contradictions, clips } = input;
  const reviewedFindings = findings.filter(
    (finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited"
  );
  const pendingHighSeverityFindings = findings.filter(
    (finding) => finding.reviewStatus === "pending" && finding.severity === "high"
  );
  const reviewedContradictions = contradictions.filter(
    (contradiction) => contradiction.reviewStatus === "approved" || contradiction.reviewStatus === "edited"
  );

  return buildClaimFileHtml({
    project,
    reviewer: input.reviewer,
    title: "Supervisor Review Packet",
    subtitle: "Human-review packet for approved evidence, open high-priority items, contradictions, and saved clips.",
    metadata: [
      { label: "Reviewed evidence", value: `${reviewedFindings.length}` },
      { label: "Pending high severity", value: `${pendingHighSeverityFindings.length}` },
      { label: "Reviewed contradictions", value: `${reviewedContradictions.length}` },
      { label: "Evidence clips", value: `${clips.length}` }
    ],
    body: `
      <section>
        <h2>Packet Checklist</h2>
        <ul>
          <li>${escapeHtml(reviewedFindings.length ? "Reviewed evidence is available for supervisor review." : "No approved evidence items are available.")}</li>
          <li>${escapeHtml(pendingHighSeverityFindings.length ? "High-severity pending findings remain open." : "No high-severity pending findings remain open.")}</li>
          <li>${escapeHtml(contradictions.length ? `${reviewedContradictions.length} of ${contradictions.length} contradiction pairs have been reviewed.` : "No contradiction pairs are present.")}</li>
          <li>${escapeHtml(clips.length ? `${clips.length} evidence clips are saved.` : "No evidence clips are saved yet.")}</li>
        </ul>
      </section>
      <section>
        <h2>Reviewed Evidence</h2>
        ${
          reviewedFindings.length
            ? reviewedFindings
                .map(
                  (finding) => `<article class="evidence-row">
                    <div class="row-head">
                      <span class="badge">${escapeHtml(finding.category)}</span>
                      <strong>${escapeHtml(finding.title)}</strong>
                      <span class="time">${escapeHtml(formatTimeRange(finding.startTimeSeconds, finding.endTimeSeconds))}</span>
                    </div>
                    <blockquote>${escapeHtml(finding.exactQuote)}</blockquote>
                    <p><strong>Reviewer status:</strong> ${escapeHtml(finding.reviewStatus)} | <strong>Confidence:</strong> ${escapeHtml(`${Math.round(finding.confidence * 100)}%`)}</p>
                    <p><strong>Follow-up:</strong> ${escapeHtml(finding.recommendedFollowUp)}</p>
                  </article>`
                )
                .join("")
            : `<p class="muted">No reviewed evidence has been approved or edited.</p>`
        }
      </section>
      <section>
        <h2>Open High-Severity Items</h2>
        ${
          pendingHighSeverityFindings.length
            ? pendingHighSeverityFindings
                .map(
                  (finding) => `<article class="evidence-row">
                    <div class="row-head">
                      <span class="badge">${escapeHtml(finding.category)}</span>
                      <strong>${escapeHtml(finding.title)}</strong>
                      <span class="time">${escapeHtml(formatTimeRange(finding.startTimeSeconds, finding.endTimeSeconds))}</span>
                    </div>
                    <blockquote>${escapeHtml(finding.exactQuote)}</blockquote>
                    <p>${escapeHtml(finding.whyItMatters)}</p>
                  </article>`
                )
                .join("")
            : `<p class="muted">No high-severity pending findings remain.</p>`
        }
      </section>
      <section>
        <h2>Evidence Clips</h2>
        ${
          clips.length
            ? `<ul>${clips
                .map(
                  (clip) =>
                    `<li><strong>${escapeHtml(clip.title)}</strong> <span class="time">${escapeHtml(formatTimeRange(clip.startTimeSeconds, clip.endTimeSeconds))}</span><br />${escapeHtml(clip.transcriptExcerpt)}</li>`
                )
                .join("")}</ul>`
            : `<p class="muted">No evidence clips are saved yet.</p>`
        }
      </section>`
  });
}
