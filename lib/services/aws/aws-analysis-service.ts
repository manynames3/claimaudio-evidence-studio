import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import { buildContradictionDetectionPrompt, buildEvidenceExtractionPrompt } from "@/lib/ai/prompts";
import { assertValidEvidenceFindings, type EvidenceFindingCandidate } from "@/lib/ai/validation";
import { getAwsRuntimeConfig } from "@/lib/server/env";
import type { ClaimPromptContext, PromptTranscriptSegment } from "@/lib/ai/prompts/shared";

export interface AwsEvidenceExtractionInput {
  claimContext: ClaimPromptContext;
  transcriptSegments: PromptTranscriptSegment[];
}

export interface AwsEvidenceExtractionResult {
  findings: EvidenceFindingCandidate[];
  rawModelText: string;
}

export interface AwsContradictionDetectionInput {
  claimContext: ClaimPromptContext;
  currentStatementSegments: PromptTranscriptSegment[];
  comparisonStatementSegments?: PromptTranscriptSegment[];
}

export class AwsAnalysisService {
  private readonly bedrockClient: BedrockRuntimeClient;

  constructor() {
    const { region } = getAwsRuntimeConfig();
    this.bedrockClient = new BedrockRuntimeClient({
      region,
      requestHandler: new FetchHttpHandler()
    });
  }

  async extractEvidence(input: AwsEvidenceExtractionInput): Promise<AwsEvidenceExtractionResult> {
    const prompt = buildEvidenceExtractionPrompt(input);
    const rawModelText = await this.invokeJsonPrompt(prompt);
    const parsed = JSON.parse(extractJsonObject(rawModelText)) as { findings?: EvidenceFindingCandidate[] };
    const findings = parsed.findings || [];

    assertValidEvidenceFindings(findings);

    return {
      findings,
      rawModelText
    };
  }

  async detectContradictions(input: AwsContradictionDetectionInput) {
    const prompt = buildContradictionDetectionPrompt(input);
    const rawModelText = await this.invokeJsonPrompt(prompt);

    // TODO: Add contradiction JSON schema validation before persistence.
    // TODO: Compare statement-vs-document evidence when uploaded documents are added to the product.
    return {
      rawModelText,
      parsed: JSON.parse(extractJsonObject(rawModelText)) as unknown
    };
  }

  private async invokeJsonPrompt(prompt: string) {
    const { bedrockModelId } = getAwsRuntimeConfig();

    if (!bedrockModelId) {
      throw new Error("AWS_BEDROCK_MODEL_ID is required for production analysis.");
    }

    const response = await this.bedrockClient.send(
      new InvokeModelCommand({
        modelId: bedrockModelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 6000,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      })
    );
    const decoded = new TextDecoder().decode(response.body);
    const envelope = JSON.parse(decoded) as { content?: Array<{ type?: string; text?: string }> };
    const text = envelope.content?.find((item) => item.type === "text")?.text;

    return text || decoded;
  }
}

function extractJsonObject(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain a JSON object.");
  }

  return value.slice(start, end + 1);
}
