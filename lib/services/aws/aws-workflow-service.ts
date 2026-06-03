import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { getAwsRuntimeConfig } from "@/lib/server/env";

export interface StartEvidenceProcessingInput {
  tenantId: string;
  claimProjectId: string;
  audioAssetId: string;
  s3Key: string;
}

export interface StartEvidenceProcessingResult {
  queueMessageId?: string;
  stepFunctionExecutionArn?: string;
}

export interface WorkflowService {
  startEvidenceProcessing(input: StartEvidenceProcessingInput): Promise<StartEvidenceProcessingResult>;
}

export class AwsWorkflowService implements WorkflowService {
  private readonly sqsClient: SQSClient;
  private readonly sfnClient: SFNClient;

  constructor() {
    const { region } = getAwsRuntimeConfig();
    this.sqsClient = new SQSClient({ region });
    this.sfnClient = new SFNClient({ region });
  }

  async startEvidenceProcessing(input: StartEvidenceProcessingInput): Promise<StartEvidenceProcessingResult> {
    const { processingQueueUrl, stateMachineArn } = getAwsRuntimeConfig();

    if (!processingQueueUrl || !stateMachineArn) {
      throw new Error("AWS_SQS_PROCESSING_QUEUE_URL and AWS_STEP_FUNCTIONS_STATE_MACHINE_ARN are required.");
    }

    const payload = {
      ...input,
      requestedAt: new Date().toISOString()
    };

    const queueResult = await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: processingQueueUrl,
        MessageBody: JSON.stringify(payload),
        MessageAttributes: {
          claimProjectId: {
            DataType: "String",
            StringValue: input.claimProjectId
          },
          audioAssetId: {
            DataType: "String",
            StringValue: input.audioAssetId
          }
        }
      })
    );

    const workflowResult = await this.sfnClient.send(
      new StartExecutionCommand({
        stateMachineArn,
        name: `claim-${input.claimProjectId}-${Date.now()}`.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80),
        input: JSON.stringify(payload)
      })
    );

    // TODO: Persist queue message ID, Step Functions execution ARN, and job status in processing_jobs.
    // TODO: Add DLQ monitoring, retry policy, and CloudWatch alarms before production uploads.
    return {
      queueMessageId: queueResult.MessageId,
      stepFunctionExecutionArn: workflowResult.executionArn
    };
  }
}
