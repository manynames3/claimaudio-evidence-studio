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
}

export interface ExportService {
  generateExport(input: GenerateExportInput): Promise<GeneratedExport>;
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
      content: buildStatementSummary(project, input.findings)
    };
  }

  if (exportType === "timestampedEvidenceMemo") {
    return {
      exportType,
      title: "Timestamped Evidence Memo",
      description: "Approved evidence items grouped by category with exact quote, timestamp, and reviewer notes.",
      format: "HTML",
      fileName: `${project.claimNumber}_timestamped_evidence_memo.html`,
      content: buildEvidenceMemo(project, input.findings)
    };
  }

  if (exportType === "contradictionReport") {
    return {
      exportType,
      title: "Contradiction Report",
      description: "Quote-paired contradiction review for SIU, credibility, and liability analysis.",
      format: "HTML",
      fileName: `${project.claimNumber}_contradiction_report.html`,
      content: buildContradictionHtml(project, input.contradictions)
    };
  }

  if (exportType === "transcript") {
    return {
      exportType,
      title: "Transcript",
      description: "Full timestamped transcript with speaker labels and confidence references.",
      format: "Text",
      fileName: `${project.claimNumber}_transcript.txt`,
      content: buildTranscript(project, input.transcriptSegments)
    };
  }

  return {
    exportType,
    title: "Supervisor Review Packet",
    description: "Structured JSON packet with pending high-severity findings, contradictions, and clips.",
    format: "JSON",
    fileName: `${project.claimNumber}_supervisor_packet.json`,
    content: buildSupervisorPacket(project, input.findings, input.contradictions, input.clips)
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

function buildStatementSummary(project: ClaimProject, findings: EvidenceFinding[]) {
  const approved = findings.filter((finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited");
  const pendingHigh = findings.filter((finding) => finding.reviewStatus === "pending" && finding.severity === "high");

  return buildClaimFileHtml({
    project,
    title: "Statement Summary",
    subtitle: "Neutral recorded-statement summary prepared from reviewer-approved evidence.",
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

function buildEvidenceMemo(project: ClaimProject, findings: EvidenceFinding[]) {
  const includedFindings = findings.filter((finding) => finding.reviewStatus === "approved" || finding.reviewStatus === "edited");

  return buildClaimFileHtml({
    project,
    title: "Timestamped Evidence Memo",
    subtitle: "Reviewer-approved evidence with exact quote and timestamp support.",
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
  title: string;
  subtitle: string;
  body: string;
}) {
  const { project, title, subtitle, body } = input;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(project.claimNumber)} ${escapeHtml(title)}</title>
  <style>
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; line-height: 1.5; }
    main { max-width: 960px; margin: 0 auto; padding: 32px; }
    header, section { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 24px; letter-spacing: 0; }
    h2 { margin: 0 0 12px; font-size: 15px; text-transform: uppercase; color: #334155; letter-spacing: 0; }
    p, li, dd { font-size: 14px; }
    .subtitle, .muted, .review-note { color: #475569; }
    .claim-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
    .claim-grid div { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #f8fafc; }
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
      <h1>${escapeHtml(title)} - ${escapeHtml(project.claimNumber)}</h1>
      <p class="subtitle">${escapeHtml(subtitle)}</p>
      <div class="claim-grid">
        <div><span class="label">Claimant</span>${escapeHtml(project.claimantName)}</div>
        <div><span class="label">Insured</span>${escapeHtml(project.insuredName)}</div>
        <div><span class="label">Loss date</span>${escapeHtml(project.lossDate)}</div>
        <div><span class="label">Claim type</span>${escapeHtml(project.claimType)}</div>
      </div>
      <p class="review-note">AI-assisted work product. Human review is required before claim-file reliance. No coverage, liability, or claim disposition conclusion is made by this export.</p>
    </header>
    ${body}
  </main>
</body>
</html>`;
}

function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildContradictionHtml(project: ClaimProject, contradictions: Contradiction[]) {
  const rows = contradictions
    .map(
      (contradiction) => `<section>
  <h2>${escapeHtml(contradiction.title)}</h2>
  <p><strong>Why it matters:</strong> ${escapeHtml(contradiction.whyItMatters)}</p>
  <p><strong>Statement A:</strong> ${escapeHtml(contradiction.statementA)}</p>
  <blockquote>${escapeHtml(contradiction.quoteA)} (${escapeHtml(formatTimeRange(contradiction.timestampA, contradiction.timestampA + 8))})</blockquote>
  <p><strong>Statement B:</strong> ${escapeHtml(contradiction.statementB)}</p>
  <blockquote>${escapeHtml(contradiction.quoteB)} (${escapeHtml(formatTimeRange(contradiction.timestampB, contradiction.timestampB + 8))})</blockquote>
</section>`
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(project.claimNumber)} Contradiction Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5; margin: 32px; background: #f8fafc; }
    main { max-width: 920px; margin: 0 auto; }
    header { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin-bottom: 16px; }
    section { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 22px; }
    h2 { margin-top: 0; font-size: 16px; }
    .note { color: #475569; font-size: 13px; }
    blockquote { border-left: 4px solid #155e75; margin-left: 0; padding-left: 12px; color: #334155; background: #f8fafc; padding-top: 8px; padding-bottom: 8px; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Contradiction Report - ${escapeHtml(project.claimNumber)}</h1>
      <p class="note">Potential inconsistencies only. No final coverage, liability, or claim disposition conclusion is made. Human review is required.</p>
    </header>
    ${rows || "<section><h2>No contradictions detected</h2><p>No quote-supported contradiction pairs are available for this statement.</p></section>"}
  </main>
</body>
</html>`;
}

function buildTranscript(project: ClaimProject, segments: TranscriptSegment[]) {
  return [
    `Transcript - ${project.claimNumber}`,
    "",
    ...segments.map(
      (segment) =>
        `[${formatTimeRange(segment.startTimeSeconds, segment.endTimeSeconds)}] ${segment.speaker}: ${segment.text}`
    )
  ].join("\n");
}

function buildSupervisorPacket(
  project: ClaimProject,
  findings: EvidenceFinding[],
  contradictions: Contradiction[],
  clips: EvidenceClip[]
) {
  return JSON.stringify(
    {
      claimProject: {
        claimNumber: project.claimNumber,
        claimantName: project.claimantName,
        insuredName: project.insuredName,
        lossDate: project.lossDate,
        claimType: project.claimType
      },
      pendingHighSeverityFindings: findings
        .filter((finding) => finding.reviewStatus === "pending" && finding.severity === "high")
        .map((finding) => ({
          category: finding.category,
          title: finding.title,
          exactQuote: finding.exactQuote,
          timestamp: formatTimeRange(finding.startTimeSeconds, finding.endTimeSeconds),
          whyItMatters: finding.whyItMatters,
          recommendedFollowUp: finding.recommendedFollowUp
        })),
      contradictions,
      evidenceClips: clips.map((clip) => ({
        title: clip.title,
        timestamp: formatTimeRange(clip.startTimeSeconds, clip.endTimeSeconds),
        transcriptExcerpt: clip.transcriptExcerpt
      }))
    },
    null,
    2
  );
}
