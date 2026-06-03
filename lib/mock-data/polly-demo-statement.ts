import {
  sampleStatementAudioDurationSeconds,
  sampleStatementAudioUrl,
  sampleStatementTimingLines
} from "@/lib/demo-audio/sample-statement";
import type { Contradiction, EvidenceClip, EvidenceFinding, ExportMemo, TranscriptSegment } from "@/lib/types";
import { formatTimeRange } from "@/lib/utils/time";

const claimProjectId = "claim-7842";
const audioAssetId = "audio-7842-statement";

export const pollyDemoAudioDurationSeconds = sampleStatementAudioDurationSeconds;
export const pollyDemoAudioUrl = sampleStatementAudioUrl;

export const pollyDemoTranscriptSegments: TranscriptSegment[] = sampleStatementTimingLines.map((line) => ({
  ...line,
  audioAssetId,
  speaker: line.speaker
}));

function segment(segmentId: string) {
  const transcriptSegment = pollyDemoTranscriptSegments.find((item) => item.id === segmentId);

  if (!transcriptSegment) {
    throw new Error(`Missing Polly demo transcript segment ${segmentId}`);
  }

  return transcriptSegment;
}

function findingTime(segmentId: string) {
  const transcriptSegment = segment(segmentId);

  return {
    startTimeSeconds: transcriptSegment.startTimeSeconds,
    endTimeSeconds: transcriptSegment.endTimeSeconds
  };
}

export const pollyDemoFindings: EvidenceFinding[] = [
  {
    id: "ef-001",
    audioAssetId,
    category: "Liability",
    title: "Possible distraction before impact",
    speaker: "Claimant",
    exactQuote: "My phone buzzed in the cup holder, and I glanced down for maybe a second",
    ...findingTime("ts-024"),
    confidence: 0.93,
    severity: "high",
    whyItMatters: "Phone interaction during the lane-check sequence may affect comparative liability and should be reconciled with the impact description.",
    recommendedFollowUp: "Clarify whether the phone was used for navigation, request any available phone records, and compare against vehicle movement timing.",
    relatedTranscriptSegmentIds: ["ts-024"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-002",
    audioAssetId,
    category: "Timeline",
    title: "Back pain onset described as two days later",
    speaker: "Claimant",
    exactQuote: "My lower back started hurting two days later",
    ...findingTime("ts-046"),
    confidence: 0.93,
    severity: "medium",
    whyItMatters: "Delayed symptom onset is material to medical causation, treatment chronology, and comparison with intake records.",
    recommendedFollowUp: "Compare with urgent care intake history and the initial claim report that referenced immediate back pain.",
    relatedTranscriptSegmentIds: ["ts-046"],
    reviewStatus: "approved",
    notes: "Include in BI chronology."
  },
  {
    id: "ef-003",
    audioAssetId,
    category: "Prior Condition",
    title: "Prior lower back strain disclosed",
    speaker: "Claimant",
    exactQuote: "I had a lower back strain about three years ago from moving furniture",
    ...findingTime("ts-054"),
    confidence: 0.93,
    severity: "high",
    whyItMatters: "Prior lumbar complaints may affect causation, apportionment, and the medical-record request scope.",
    recommendedFollowUp: "Request records for prior back treatment and confirm whether symptoms had fully resolved before the loss.",
    relatedTranscriptSegmentIds: ["ts-054"],
    reviewStatus: "approved",
    notes: ""
  },
  {
    id: "ef-004",
    audioAssetId,
    category: "Damages",
    title: "Vehicle was drivable after impact",
    speaker: "Claimant",
    exactQuote: "Yes, I drove it home",
    ...findingTime("ts-032"),
    confidence: 0.93,
    severity: "medium",
    whyItMatters: "Drivability and no tow may inform impact severity, property damage review, and injury correlation.",
    recommendedFollowUp: "Compare with scene photos, repair estimate, and final invoice once available.",
    relatedTranscriptSegmentIds: ["ts-032"],
    reviewStatus: "approved",
    notes: ""
  },
  {
    id: "ef-005",
    audioAssetId,
    category: "Injury",
    title: "No injury reported at the scene",
    speaker: "Claimant",
    exactQuote: "I told the other driver I was okay",
    ...findingTime("ts-044"),
    confidence: 0.93,
    severity: "medium",
    whyItMatters: "No contemporaneous injury report may be relevant to injury evaluation and settlement posture.",
    recommendedFollowUp: "Confirm any police report injury field and compare against later treatment history.",
    relatedTranscriptSegmentIds: ["ts-044"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-006",
    audioAssetId,
    category: "Coverage",
    title: "Vehicle use involved work errand",
    speaker: "Claimant",
    exactQuote: "My manager asked me to pick up printer toner and receipt paper",
    ...findingTime("ts-010"),
    confidence: 0.93,
    severity: "high",
    whyItMatters: "Business use may trigger coverage questions depending on policy terms, employer involvement, and other available coverage.",
    recommendedFollowUp: "Review policy business-use language and ask whether the employer reimbursed mileage or required the errand.",
    relatedTranscriptSegmentIds: ["ts-010", "ts-012"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-007",
    audioAssetId,
    category: "Credibility",
    title: "Speed estimate changed during statement",
    speaker: "Claimant",
    exactQuote: "It might have been forty, maybe closer to forty-five",
    ...findingTime("ts-028"),
    confidence: 0.93,
    severity: "low",
    whyItMatters: "A changing speed estimate weakens precision of liability reconstruction and should be compared with objective evidence.",
    recommendedFollowUp: "Compare with speed limit, vehicle damage, dashcam, telematics, and insured statement.",
    relatedTranscriptSegmentIds: ["ts-026", "ts-028"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-008",
    audioAssetId,
    category: "Follow-up",
    title: "Missing witness contact information",
    speaker: "Claimant",
    exactQuote: "I did not get his full name",
    ...findingTime("ts-038"),
    confidence: 0.93,
    severity: "medium",
    whyItMatters: "A potential independent witness cannot be contacted without additional identifying information.",
    recommendedFollowUp: "Check police report, gas station camera footage, receipts, or scene photos for witness identity.",
    relatedTranscriptSegmentIds: ["ts-038", "ts-040"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-009",
    audioAssetId,
    category: "SIU Flag",
    title: "Lane-change account requires review",
    speaker: "Claimant",
    exactQuote: "I was trying to get over and then everything happened quickly",
    ...findingTime("ts-064"),
    confidence: 0.93,
    severity: "high",
    whyItMatters: "The later description may conflict with the earlier denial of changing lanes and affects liability theory.",
    recommendedFollowUp: "Compare against the insured statement, vehicle points of impact, lane markings, and any video evidence.",
    relatedTranscriptSegmentIds: ["ts-016", "ts-018", "ts-064"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-010",
    audioAssetId,
    category: "Liability",
    title: "Lane movement uncertainty",
    speaker: "Claimant",
    exactQuote: "I had checked my mirror and I was thinking about moving right",
    ...findingTime("ts-018"),
    confidence: 0.93,
    severity: "high",
    whyItMatters: "Lane movement uncertainty could change the liability theory from a simple side impact to unsafe lane movement or comparative negligence.",
    recommendedFollowUp: "Clarify lane position, signal timing, mirror check, and whether the claimant had begun moving right.",
    relatedTranscriptSegmentIds: ["ts-018", "ts-022"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-011",
    audioAssetId,
    category: "Damages",
    title: "Repair estimate not yet received",
    speaker: "Claimant",
    exactQuote: "Not yet. The body shop said they could inspect it next week",
    ...findingTime("ts-062"),
    confidence: 0.93,
    severity: "low",
    whyItMatters: "Property damage severity remains unverified for injury correlation and reserve evaluation.",
    recommendedFollowUp: "Hold final BI valuation until estimate, photos, and repair invoice are received.",
    relatedTranscriptSegmentIds: ["ts-062"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-012",
    audioAssetId,
    category: "Injury",
    title: "Four-day gap before urgent care",
    speaker: "Claimant",
    exactQuote: "I went to urgent care on May eighteenth because the back pain was not going away",
    ...findingTime("ts-050"),
    confidence: 0.93,
    severity: "medium",
    whyItMatters: "Treatment delay may be material to medical causation, injury severity, and claim valuation.",
    recommendedFollowUp: "Review urgent care intake for onset timing, symptoms, and causation history.",
    relatedTranscriptSegmentIds: ["ts-050"],
    reviewStatus: "approved",
    notes: ""
  }
];

export const pollyDemoContradictions: Contradiction[] = [
  {
    id: "con-001",
    audioAssetId,
    title: "Lane-change denial versus later lane movement",
    statementA: "Claimant denied changing lanes during the impact sequence.",
    statementB: "Claimant later stated she was trying to get over before everything happened quickly.",
    quoteA: "No, I was not changing lanes. I was in my lane.",
    quoteB: "I was trying to get over and then everything happened quickly.",
    timestampA: segment("ts-016").startTimeSeconds,
    timestampB: segment("ts-064").startTimeSeconds,
    whyItMatters: "This potential inconsistency affects liability allocation and whether comparative negligence should be evaluated.",
    reviewStatus: "pending"
  },
  {
    id: "con-002",
    audioAssetId,
    title: "Speed estimate increased during statement",
    statementA: "Claimant first estimated speed at approximately thirty-five miles per hour.",
    statementB: "Claimant later said it might have been forty or closer to forty-five.",
    quoteA: "Around thirty-five miles per hour.",
    quoteB: "It might have been forty, maybe closer to forty-five.",
    timestampA: segment("ts-026").startTimeSeconds,
    timestampB: segment("ts-028").startTimeSeconds,
    whyItMatters: "A shifting estimate should be treated differently than a precise observation when reconstructing the loss.",
    reviewStatus: "pending"
  },
  {
    id: "con-003",
    audioAssetId,
    title: "Back pain chronology requires reconciliation",
    statementA: "The prior claim report reportedly said back pain was immediate.",
    statementB: "Recorded statement says lower back pain started two days later.",
    quoteA: "Earlier in your claim report, you said you felt back pain right away.",
    quoteB: "My lower back started hurting two days later.",
    timestampA: segment("ts-047").startTimeSeconds,
    timestampB: segment("ts-046").startTimeSeconds,
    whyItMatters: "Medical records should be checked for consistent onset, severity, and causation history.",
    reviewStatus: "approved"
  }
];

export const pollyDemoEvidenceClips: EvidenceClip[] = [
  {
    id: "clip-001",
    audioAssetId,
    claimProjectId,
    title: "Phone glance before impact",
    ...findingTime("ts-024"),
    transcriptExcerpt: "My phone buzzed in the cup holder, and I glanced down for maybe a second...",
    linkedFindingIds: ["ef-001"],
    createdBy: "Demo Reviewer",
    createdAt: "2026-06-02T13:11:00.000Z"
  },
  {
    id: "clip-002",
    audioAssetId,
    claimProjectId,
    title: "Lane-change contradiction",
    startTimeSeconds: segment("ts-016").startTimeSeconds,
    endTimeSeconds: segment("ts-018").endTimeSeconds,
    transcriptExcerpt: "No, I was not changing lanes... I had checked my mirror and I was thinking about moving right...",
    linkedFindingIds: ["ef-009", "ef-010"],
    createdBy: "Demo Reviewer",
    createdAt: "2026-06-02T13:15:00.000Z"
  },
  {
    id: "clip-003",
    audioAssetId,
    claimProjectId,
    title: "Prior back condition",
    ...findingTime("ts-054"),
    transcriptExcerpt: "I had a lower back strain about three years ago from moving furniture...",
    linkedFindingIds: ["ef-003"],
    createdBy: "Demo Reviewer",
    createdAt: "2026-06-02T13:18:00.000Z"
  },
  {
    id: "clip-004",
    audioAssetId,
    claimProjectId,
    title: "Business-use coverage issue",
    startTimeSeconds: segment("ts-010").startTimeSeconds,
    endTimeSeconds: segment("ts-012").endTimeSeconds,
    transcriptExcerpt: "My manager asked me to pick up printer toner and receipt paper... I was doing it because my manager asked.",
    linkedFindingIds: ["ef-006"],
    createdBy: "Demo Reviewer",
    createdAt: "2026-06-02T13:21:00.000Z"
  }
];

const approvedFindingsText = pollyDemoFindings
  .filter((finding) => finding.reviewStatus === "approved")
  .map(
    (finding) =>
      `- [${formatTimeRange(finding.startTimeSeconds, finding.endTimeSeconds)}] ${finding.category}: ${finding.title}. Quote: "${finding.exactQuote}". ${finding.whyItMatters}`
  )
  .join("\n");

export const pollyDemoExportMemos: ExportMemo[] = [
  {
    id: "memo-001",
    claimProjectId,
    audioAssetId,
    exportType: "timestampedEvidenceMemo",
    title: "Timestamped Evidence Memo - AUTO-BI-7842",
    includedFindingIds: ["ef-002", "ef-003", "ef-004", "ef-012"],
    includedContradictionIds: ["con-003"],
    includedClipIds: ["clip-003"],
    createdAt: "2026-06-02T13:28:00.000Z",
    content: `ClaimAudio Evidence Memo
Claim: AUTO-BI-7842
Claimant: Maria Santos
Loss Type: Auto bodily injury

Reviewed evidence items:
${approvedFindingsText}

Supervisor note:
The Polly sample statement contains review-worthy liability, coverage, injury chronology, and prior-condition issues. Pending findings should be resolved before final settlement authority.`
  }
];
