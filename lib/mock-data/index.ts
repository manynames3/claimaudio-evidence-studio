import type {
  AuditLogEvent,
  AudioAsset,
  ClaimProject,
  Contradiction,
  EvidenceClip,
  EvidenceFinding,
  ExportMemo,
  TranscriptSegment
} from "@/lib/types";
import { formatTimeRange } from "@/lib/utils/time";

export const evidenceCategories = [
  "Liability",
  "Injury",
  "Damages",
  "Prior Condition",
  "Timeline",
  "Coverage",
  "Credibility",
  "SIU Flag",
  "Follow-up"
] as const;

export const mockProjects: ClaimProject[] = [
  {
    id: "claim-7842",
    claimNumber: "AUTO-BI-7842",
    claimantName: "Maria Santos",
    insuredName: "Evan Brooks",
    lossDate: "2026-05-14",
    claimType: "Auto bodily injury",
    lineOfBusiness: "Personal Auto",
    status: "reviewing",
    audioAssetId: "audio-7842-statement",
    reviewFlags: {
      readyForReview: true,
      needsSupervisorReview: true,
      siuFlagged: true,
      draftMemoReady: true
    },
    createdAt: "2026-05-16T13:20:00.000Z",
    updatedAt: "2026-06-02T13:04:00.000Z"
  },
  {
    id: "claim-1299",
    claimNumber: "AUTO-LIAB-1299",
    claimantName: "Brandon Lee",
    insuredName: "Northstar Delivery LLC",
    lossDate: "2026-05-22",
    claimType: "Auto liability",
    lineOfBusiness: "Commercial Auto",
    status: "ready",
    audioAssetId: "audio-1299-statement",
    reviewFlags: {
      readyForReview: true,
      needsSupervisorReview: false,
      siuFlagged: false,
      draftMemoReady: false
    },
    createdAt: "2026-05-23T11:12:00.000Z",
    updatedAt: "2026-05-29T15:45:00.000Z"
  },
  {
    id: "claim-4410",
    claimNumber: "AUTO-UM-4410",
    claimantName: "Denise Carter",
    insuredName: "Denise Carter",
    lossDate: "2026-05-05",
    claimType: "UM/UIM bodily injury",
    lineOfBusiness: "Personal Auto",
    status: "draft",
    audioAssetId: "audio-4410-statement",
    reviewFlags: {
      readyForReview: false,
      needsSupervisorReview: false,
      siuFlagged: false,
      draftMemoReady: true
    },
    createdAt: "2026-05-06T09:18:00.000Z",
    updatedAt: "2026-05-28T19:10:00.000Z"
  }
];

export const mockAudioAssets: AudioAsset[] = [
  {
    id: "audio-7842-statement",
    claimProjectId: "claim-7842",
    fileName: "Santos_recorded_statement_2026-05-16.wav",
    durationSeconds: 658,
    sourceType: "sample",
    processingStatus: "readyForReview",
    createdAt: "2026-05-16T13:24:00.000Z"
  },
  {
    id: "audio-1299-statement",
    claimProjectId: "claim-1299",
    fileName: "Lee_delivery_loss_statement.mp3",
    durationSeconds: 482,
    sourceType: "sample",
    processingStatus: "readyForReview",
    createdAt: "2026-05-23T11:26:00.000Z"
  },
  {
    id: "audio-4410-statement",
    claimProjectId: "claim-4410",
    fileName: "Carter_UM_recording_pending_review.m4a",
    durationSeconds: 536,
    sourceType: "sample",
    processingStatus: "analyzing",
    createdAt: "2026-05-06T09:29:00.000Z"
  }
];

export const mockTranscriptSegments: TranscriptSegment[] = [
  {
    id: "ts-001",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 0,
    endTimeSeconds: 12,
    confidence: 0.99,
    text: "This is Daniel Price with North Harbor Mutual. Today is May 16, 2026, and I am speaking with Maria Santos regarding claim AUTO-BI-7842."
  },
  {
    id: "ts-002",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 13,
    endTimeSeconds: 24,
    confidence: 0.98,
    text: "Yes, this is Maria Santos, and I understand this recorded statement is about the accident from May 14."
  },
  {
    id: "ts-003",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 25,
    endTimeSeconds: 39,
    confidence: 0.97,
    text: "Please describe where you were going and what you remember just before the impact."
  },
  {
    id: "ts-004",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 40,
    endTimeSeconds: 58,
    confidence: 0.95,
    text: "I was headed east on Briar Avenue toward the pharmacy, and I was in the right lane because I planned to turn a few blocks later."
  },
  {
    id: "ts-005",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 59,
    endTimeSeconds: 74,
    confidence: 0.97,
    text: "Were you using your phone, navigation, radio, or anything else in the vehicle before the collision?"
  },
  {
    id: "ts-006",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 75,
    endTimeSeconds: 93,
    confidence: 0.92,
    text: "I glanced down at my phone because the map had rerouted, but it was just for a second and then I looked back up."
  },
  {
    id: "ts-007",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 94,
    endTimeSeconds: 107,
    confidence: 0.98,
    text: "Do you know approximately how fast you were traveling at that point?"
  },
  {
    id: "ts-008",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 108,
    endTimeSeconds: 126,
    confidence: 0.91,
    text: "I am not completely sure. Maybe thirty-five, maybe closer to forty, because traffic was moving but not really fast."
  },
  {
    id: "ts-009",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 127,
    endTimeSeconds: 143,
    confidence: 0.96,
    text: "Did you change lanes or attempt to change lanes before the other vehicle made contact?"
  },
  {
    id: "ts-010",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 144,
    endTimeSeconds: 165,
    confidence: 0.9,
    text: "I may have drifted a little left to avoid a delivery van, but I do not think I fully changed lanes before I felt the hit."
  },
  {
    id: "ts-011",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 166,
    endTimeSeconds: 180,
    confidence: 0.97,
    text: "Earlier in your notice of loss you said the impact happened while you were stopped. Is that still your recollection?"
  },
  {
    id: "ts-012",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 181,
    endTimeSeconds: 204,
    confidence: 0.88,
    text: "I said stopped because it felt like everything froze, but I was probably rolling slowly when the bumper was hit."
  },
  {
    id: "ts-013",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 205,
    endTimeSeconds: 219,
    confidence: 0.99,
    text: "What happened immediately after the vehicles made contact?"
  },
  {
    id: "ts-014",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 220,
    endTimeSeconds: 241,
    confidence: 0.94,
    text: "We pulled into the gas station lot. My car was still drivable, and I moved it out of the lane myself."
  },
  {
    id: "ts-015",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 242,
    endTimeSeconds: 258,
    confidence: 0.96,
    text: "Was there visible damage to your vehicle, and have you received an estimate yet?"
  },
  {
    id: "ts-016",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 259,
    endTimeSeconds: 281,
    confidence: 0.93,
    text: "There are scratches and a dent near the rear quarter panel, but I have not received the repair estimate yet."
  },
  {
    id: "ts-017",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 282,
    endTimeSeconds: 298,
    confidence: 0.97,
    text: "Did you feel pain right away at the scene?"
  },
  {
    id: "ts-018",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 299,
    endTimeSeconds: 321,
    confidence: 0.91,
    text: "At the scene I mostly felt shaken up. My back did not really start hurting until later that evening."
  },
  {
    id: "ts-019",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 322,
    endTimeSeconds: 337,
    confidence: 0.96,
    text: "Did you tell anyone at the scene that you were injured or request medical assistance?"
  },
  {
    id: "ts-020",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 338,
    endTimeSeconds: 359,
    confidence: 0.94,
    text: "No, I did not ask for an ambulance, and I told the officer I thought I was okay at that moment."
  },
  {
    id: "ts-021",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 360,
    endTimeSeconds: 377,
    confidence: 0.98,
    text: "When did you first seek medical treatment after the accident?"
  },
  {
    id: "ts-022",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 378,
    endTimeSeconds: 401,
    confidence: 0.93,
    text: "I went to urgent care on Sunday afternoon, so about three days after the crash, because the soreness was getting worse."
  },
  {
    id: "ts-023",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 402,
    endTimeSeconds: 419,
    confidence: 0.97,
    text: "Have you had prior back or neck injuries before this loss?"
  },
  {
    id: "ts-024",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 420,
    endTimeSeconds: 446,
    confidence: 0.89,
    text: "I had a lower back strain from lifting boxes last year, but it had mostly resolved before this accident."
  },
  {
    id: "ts-025",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 447,
    endTimeSeconds: 462,
    confidence: 0.98,
    text: "Were you working, commuting, or doing anything business-related when the accident occurred?"
  },
  {
    id: "ts-026",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 463,
    endTimeSeconds: 489,
    confidence: 0.92,
    text: "I was dropping off prescriptions for the home care agency before going back to my regular route."
  },
  {
    id: "ts-027",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 490,
    endTimeSeconds: 506,
    confidence: 0.96,
    text: "Do you have the name and phone number of any witness who saw the impact?"
  },
  {
    id: "ts-028",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 507,
    endTimeSeconds: 529,
    confidence: 0.91,
    text: "There was a man at the pump who said he saw it, but I only got his first name, Tony, not his phone number."
  },
  {
    id: "ts-029",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 530,
    endTimeSeconds: 546,
    confidence: 0.98,
    text: "In your first call you mentioned the other vehicle was speeding. What makes you believe that?"
  },
  {
    id: "ts-030",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 547,
    endTimeSeconds: 573,
    confidence: 0.86,
    text: "I cannot say for sure. I heard brakes and then the hit, so I assumed they were speeding, but I did not actually see their speed."
  },
  {
    id: "ts-031",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 574,
    endTimeSeconds: 592,
    confidence: 0.97,
    text: "Have you missed work or lost income because of this accident?"
  },
  {
    id: "ts-032",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 593,
    endTimeSeconds: 615,
    confidence: 0.9,
    text: "I missed one shift on Monday, but I do not have wage paperwork yet because my supervisor has not sent it."
  },
  {
    id: "ts-033",
    audioAssetId: "audio-7842-statement",
    speaker: "Adjuster",
    startTimeSeconds: 616,
    endTimeSeconds: 634,
    confidence: 0.99,
    text: "Is there anything else about the accident or your injuries that you think we should know?"
  },
  {
    id: "ts-034",
    audioAssetId: "audio-7842-statement",
    speaker: "Claimant",
    startTimeSeconds: 635,
    endTimeSeconds: 658,
    confidence: 0.91,
    text: "Just that my back feels worse than it did that night, and I am waiting to see whether urgent care refers me to physical therapy."
  }
];

export const mockFindings: EvidenceFinding[] = [
  {
    id: "ef-001",
    audioAssetId: "audio-7842-statement",
    category: "Liability",
    title: "Possible distraction before impact",
    speaker: "Claimant",
    exactQuote: "I glanced down at my phone because the map had rerouted",
    startTimeSeconds: 75,
    endTimeSeconds: 93,
    confidence: 0.92,
    severity: "high",
    whyItMatters: "Phone interaction immediately before the collision may affect comparative liability and should be reconciled with impact sequence.",
    recommendedFollowUp: "Request phone records or clarify whether the claimant was navigating hands-free.",
    relatedTranscriptSegmentIds: ["ts-006"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-002",
    audioAssetId: "audio-7842-statement",
    category: "Timeline",
    title: "Pain onset described as later that evening",
    speaker: "Claimant",
    exactQuote: "My back did not really start hurting until later that evening",
    startTimeSeconds: 299,
    endTimeSeconds: 321,
    confidence: 0.91,
    severity: "medium",
    whyItMatters: "Delayed symptom onset may be important for causation analysis and treatment chronology.",
    recommendedFollowUp: "Compare with urgent care intake history and any police report injury notation.",
    relatedTranscriptSegmentIds: ["ts-018"],
    reviewStatus: "approved",
    notes: "Include in BI chronology."
  },
  {
    id: "ef-003",
    audioAssetId: "audio-7842-statement",
    category: "Prior Condition",
    title: "Prior lower back strain disclosed",
    speaker: "Claimant",
    exactQuote: "I had a lower back strain from lifting boxes last year",
    startTimeSeconds: 420,
    endTimeSeconds: 446,
    confidence: 0.89,
    severity: "high",
    whyItMatters: "Prior lumbar complaints may affect causation, apportionment, and medical record requests.",
    recommendedFollowUp: "Request records for prior back treatment and confirm date of resolution.",
    relatedTranscriptSegmentIds: ["ts-024"],
    reviewStatus: "approved",
    notes: ""
  },
  {
    id: "ef-004",
    audioAssetId: "audio-7842-statement",
    category: "Damages",
    title: "Vehicle was drivable after impact",
    speaker: "Claimant",
    exactQuote: "My car was still drivable, and I moved it out of the lane myself",
    startTimeSeconds: 220,
    endTimeSeconds: 241,
    confidence: 0.94,
    severity: "medium",
    whyItMatters: "Drivability may inform impact severity and property damage review.",
    recommendedFollowUp: "Compare with photos, estimate, and final repair invoice.",
    relatedTranscriptSegmentIds: ["ts-014"],
    reviewStatus: "approved",
    notes: ""
  },
  {
    id: "ef-005",
    audioAssetId: "audio-7842-statement",
    category: "Injury",
    title: "No medical assistance requested at scene",
    speaker: "Claimant",
    exactQuote: "I did not ask for an ambulance, and I told the officer I thought I was okay",
    startTimeSeconds: 338,
    endTimeSeconds: 359,
    confidence: 0.94,
    severity: "medium",
    whyItMatters: "No contemporaneous injury report may be relevant to injury evaluation and settlement posture.",
    recommendedFollowUp: "Confirm police report injury field and body-worn camera availability if applicable.",
    relatedTranscriptSegmentIds: ["ts-020"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-006",
    audioAssetId: "audio-7842-statement",
    category: "Coverage",
    title: "Vehicle use involved work errand",
    speaker: "Claimant",
    exactQuote: "I was dropping off prescriptions for the home care agency",
    startTimeSeconds: 463,
    endTimeSeconds: 489,
    confidence: 0.92,
    severity: "high",
    whyItMatters: "Business use may trigger coverage questions depending on policy terms and employer involvement.",
    recommendedFollowUp: "Review policy business-use exclusion and determine whether employer coverage applies.",
    relatedTranscriptSegmentIds: ["ts-026"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-007",
    audioAssetId: "audio-7842-statement",
    category: "Credibility",
    title: "Speed estimate is uncertain",
    speaker: "Claimant",
    exactQuote: "Maybe thirty-five, maybe closer to forty",
    startTimeSeconds: 108,
    endTimeSeconds: 126,
    confidence: 0.91,
    severity: "low",
    whyItMatters: "Uncertain speed testimony weakens precision of liability reconstruction.",
    recommendedFollowUp: "Compare with speed limit, vehicle damage, and any telematics or dashcam evidence.",
    relatedTranscriptSegmentIds: ["ts-008"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-008",
    audioAssetId: "audio-7842-statement",
    category: "Follow-up",
    title: "Missing witness contact information",
    speaker: "Claimant",
    exactQuote: "I only got his first name, Tony, not his phone number",
    startTimeSeconds: 507,
    endTimeSeconds: 529,
    confidence: 0.91,
    severity: "medium",
    whyItMatters: "Potential independent witness cannot be contacted without additional identifying information.",
    recommendedFollowUp: "Check police report, gas station camera footage, or receipt records for witness identity.",
    relatedTranscriptSegmentIds: ["ts-028"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-009",
    audioAssetId: "audio-7842-statement",
    category: "SIU Flag",
    title: "Stopped versus rolling account mismatch",
    speaker: "Claimant",
    exactQuote: "I said stopped because it felt like everything froze, but I was probably rolling slowly",
    startTimeSeconds: 181,
    endTimeSeconds: 204,
    confidence: 0.88,
    severity: "high",
    whyItMatters: "Change in impact description may affect liability allocation and credibility assessment.",
    recommendedFollowUp: "Compare initial loss call, police narrative, and insured statement.",
    relatedTranscriptSegmentIds: ["ts-011", "ts-012"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-010",
    audioAssetId: "audio-7842-statement",
    category: "Liability",
    title: "Lane change uncertainty",
    speaker: "Claimant",
    exactQuote: "I may have drifted a little left to avoid a delivery van",
    startTimeSeconds: 144,
    endTimeSeconds: 165,
    confidence: 0.9,
    severity: "high",
    whyItMatters: "Lane position uncertainty could change the liability theory from rear-end impact to unsafe lane movement.",
    recommendedFollowUp: "Clarify lane markings, delivery van location, and whether any signal was used.",
    relatedTranscriptSegmentIds: ["ts-010"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-011",
    audioAssetId: "audio-7842-statement",
    category: "Damages",
    title: "Repair estimate not yet received",
    speaker: "Claimant",
    exactQuote: "I have not received the repair estimate yet",
    startTimeSeconds: 259,
    endTimeSeconds: 281,
    confidence: 0.93,
    severity: "low",
    whyItMatters: "Property damage severity remains unverified for injury correlation and reserve evaluation.",
    recommendedFollowUp: "Hold final BI valuation until estimate and photos are received.",
    relatedTranscriptSegmentIds: ["ts-016"],
    reviewStatus: "pending",
    notes: ""
  },
  {
    id: "ef-012",
    audioAssetId: "audio-7842-statement",
    category: "Injury",
    title: "Three-day gap before urgent care",
    speaker: "Claimant",
    exactQuote: "I went to urgent care on Sunday afternoon, so about three days after the crash",
    startTimeSeconds: 378,
    endTimeSeconds: 401,
    confidence: 0.93,
    severity: "medium",
    whyItMatters: "Treatment delay may be material to medical causation and injury severity evaluation.",
    recommendedFollowUp: "Review urgent care intake form for onset timing and reported symptoms.",
    relatedTranscriptSegmentIds: ["ts-022"],
    reviewStatus: "approved",
    notes: ""
  }
];

export const mockContradictions: Contradiction[] = [
  {
    id: "con-001",
    audioAssetId: "audio-7842-statement",
    title: "Stopped vehicle versus rolling vehicle",
    statementA: "Initial notice described the claimant as stopped at impact.",
    statementB: "Recorded statement says the vehicle was probably rolling slowly.",
    quoteA: "Earlier in your notice of loss you said the impact happened while you were stopped.",
    quoteB: "I was probably rolling slowly when the bumper was hit.",
    timestampA: 166,
    timestampB: 181,
    whyItMatters: "Liability theory and comparative fault may change if the claimant was moving during lane uncertainty.",
    reviewStatus: "pending"
  },
  {
    id: "con-002",
    audioAssetId: "audio-7842-statement",
    title: "Speed allegation softened during statement",
    statementA: "First call reportedly alleged the other vehicle was speeding.",
    statementB: "Recorded statement admits speed was assumed, not observed.",
    quoteA: "In your first call you mentioned the other vehicle was speeding.",
    quoteB: "I assumed they were speeding, but I did not actually see their speed.",
    timestampA: 530,
    timestampB: 547,
    whyItMatters: "A speculative speed allegation should be treated differently from direct observation.",
    reviewStatus: "pending"
  },
  {
    id: "con-003",
    audioAssetId: "audio-7842-statement",
    title: "Pain chronology requires reconciliation",
    statementA: "Claimant reports being okay at the scene.",
    statementB: "Claimant later reports worsening back pain and urgent care visit.",
    quoteA: "I told the officer I thought I was okay at that moment.",
    quoteB: "The soreness was getting worse.",
    timestampA: 338,
    timestampB: 378,
    whyItMatters: "Medical records should be checked for consistent onset, severity, and causation history.",
    reviewStatus: "approved"
  }
];

export const mockEvidenceClips: EvidenceClip[] = [
  {
    id: "clip-001",
    audioAssetId: "audio-7842-statement",
    claimProjectId: "claim-7842",
    title: "Phone glance before impact",
    startTimeSeconds: 75,
    endTimeSeconds: 93,
    transcriptExcerpt: "I glanced down at my phone because the map had rerouted...",
    linkedFindingIds: ["ef-001"],
    createdBy: "Demo Reviewer",
    createdAt: "2026-06-02T13:11:00.000Z"
  },
  {
    id: "clip-002",
    audioAssetId: "audio-7842-statement",
    claimProjectId: "claim-7842",
    title: "Lane drift uncertainty",
    startTimeSeconds: 144,
    endTimeSeconds: 165,
    transcriptExcerpt: "I may have drifted a little left to avoid a delivery van...",
    linkedFindingIds: ["ef-010"],
    createdBy: "Demo Reviewer",
    createdAt: "2026-06-02T13:15:00.000Z"
  },
  {
    id: "clip-003",
    audioAssetId: "audio-7842-statement",
    claimProjectId: "claim-7842",
    title: "Prior back condition",
    startTimeSeconds: 420,
    endTimeSeconds: 446,
    transcriptExcerpt: "I had a lower back strain from lifting boxes last year...",
    linkedFindingIds: ["ef-003"],
    createdBy: "Demo Reviewer",
    createdAt: "2026-06-02T13:18:00.000Z"
  },
  {
    id: "clip-004",
    audioAssetId: "audio-7842-statement",
    claimProjectId: "claim-7842",
    title: "Business-use coverage issue",
    startTimeSeconds: 463,
    endTimeSeconds: 489,
    transcriptExcerpt: "I was dropping off prescriptions for the home care agency...",
    linkedFindingIds: ["ef-006"],
    createdBy: "Demo Reviewer",
    createdAt: "2026-06-02T13:21:00.000Z"
  }
];

const approvedFindingsText = mockFindings
  .filter((finding) => finding.reviewStatus === "approved")
  .map(
    (finding) =>
      `- [${formatTimeRange(finding.startTimeSeconds, finding.endTimeSeconds)}] ${finding.category}: ${finding.title}. Quote: "${finding.exactQuote}". ${finding.whyItMatters}`
  )
  .join("\n");

export const mockExportMemos: ExportMemo[] = [
  {
    id: "memo-001",
    claimProjectId: "claim-7842",
    audioAssetId: "audio-7842-statement",
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
The statement contains several review-worthy liability and coverage issues, including phone use, lane uncertainty, business use, and a prior lumbar condition. Pending findings should be resolved before final settlement authority.`
  }
];

export const mockAuditEvents: AuditLogEvent[] = [
  {
    id: "audit-seed-001",
    claimProjectId: "claim-7842",
    audioAssetId: "audio-7842-statement",
    eventType: "projectCreated",
    actor: "Demo Reviewer",
    targetType: "project",
    targetId: "claim-7842",
    summary: "Project AUTO-BI-7842 created for recorded statement review.",
    createdAt: "2026-06-02T13:00:00.000Z"
  },
  {
    id: "audit-seed-002",
    claimProjectId: "claim-7842",
    audioAssetId: "audio-7842-statement",
    eventType: "audioUploaded",
    actor: "Demo Reviewer",
    targetType: "audio",
    targetId: "audio-7842-statement",
    summary: "Recorded statement audio uploaded to mock encrypted storage.",
    createdAt: "2026-06-02T13:02:00.000Z"
  },
  {
    id: "audit-seed-003",
    claimProjectId: "claim-7842",
    audioAssetId: "audio-7842-statement",
    eventType: "transcriptionCompleted",
    actor: "System",
    targetType: "transcript",
    targetId: "audio-7842-statement",
    summary: "Mock transcription completed with 34 timestamped transcript segments.",
    createdAt: "2026-06-02T13:04:00.000Z"
  },
  {
    id: "audit-seed-004",
    claimProjectId: "claim-7842",
    audioAssetId: "audio-7842-statement",
    eventType: "analysisCompleted",
    actor: "System",
    targetType: "analysis",
    targetId: "audio-7842-statement",
    summary: "Mock evidence analysis completed with 12 findings and 3 contradictions.",
    createdAt: "2026-06-02T13:06:00.000Z"
  }
];
