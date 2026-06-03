export type BackendMode = "mock" | "neon-aws";

export interface AuthRuntimeStatus {
  requireAuth: boolean;
  authConfigured: boolean;
  pilotAccessCodeConfigured: boolean;
  supervisorAccessCodeConfigured: boolean;
  adminAccessCodeConfigured: boolean;
  sessionSecretConfigured: boolean;
  tenantIdConfigured: boolean;
  authProvider: "pilot-cookie" | "disabled";
}

export interface RuntimeBackendStatus {
  backendMode: BackendMode;
  neonConfigured: boolean;
  awsConfigured: boolean;
  auth: AuthRuntimeStatus;
  missingNeonEnv: string[];
  missingAwsEnv: string[];
}

const requiredAwsEnv = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_KMS_KEY_ARN",
  "AWS_S3_AUDIO_BUCKET",
  "AWS_S3_EXPORT_BUCKET",
  "AWS_SQS_PROCESSING_QUEUE_URL",
  "AWS_STEP_FUNCTIONS_STATE_MACHINE_ARN",
  "AWS_BEDROCK_MODEL_ID"
] as const;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
}

export function getBackendMode(): BackendMode {
  return process.env.CLAIMAUDIO_BACKEND_MODE === "neon-aws" ? "neon-aws" : "mock";
}

export function getRuntimeBackendStatus(): RuntimeBackendStatus {
  const missingAwsEnv = requiredAwsEnv.filter((key) => !process.env[key]);
  const missingNeonEnv = getDatabaseUrl() ? [] : ["DATABASE_URL"];

  return {
    backendMode: getBackendMode(),
    neonConfigured: missingNeonEnv.length === 0,
    awsConfigured: missingAwsEnv.length === 0,
    auth: getAuthRuntimeStatus(),
    missingNeonEnv,
    missingAwsEnv
  };
}

function getAuthRuntimeStatus(): AuthRuntimeStatus {
  const requireAuth = process.env.CLAIMAUDIO_REQUIRE_AUTH !== "false";
  const pilotAccessCodeConfigured = Boolean(process.env.CLAIMAUDIO_PILOT_ACCESS_CODE);
  const supervisorAccessCodeConfigured = Boolean(process.env.CLAIMAUDIO_SUPERVISOR_ACCESS_CODE);
  const adminAccessCodeConfigured = Boolean(process.env.CLAIMAUDIO_ADMIN_ACCESS_CODE);
  const sessionSecretConfigured = Boolean(process.env.CLAIMAUDIO_SESSION_SECRET);

  return {
    requireAuth,
    authConfigured: !requireAuth || (pilotAccessCodeConfigured && sessionSecretConfigured),
    pilotAccessCodeConfigured,
    supervisorAccessCodeConfigured,
    adminAccessCodeConfigured,
    sessionSecretConfigured,
    tenantIdConfigured: Boolean(process.env.CLAIMAUDIO_TENANT_ID),
    authProvider: requireAuth ? "pilot-cookie" : "disabled"
  };
}

export function requireDatabaseUrl() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or NEON_DATABASE_URL is required for Neon Postgres mode.");
  }

  return databaseUrl;
}

export function getAwsRuntimeConfig() {
  return {
    region: process.env.AWS_REGION || "us-east-1",
    audioBucket: process.env.AWS_S3_AUDIO_BUCKET || "",
    exportBucket: process.env.AWS_S3_EXPORT_BUCKET || "",
    processingQueueUrl: process.env.AWS_SQS_PROCESSING_QUEUE_URL || "",
    stateMachineArn: process.env.AWS_STEP_FUNCTIONS_STATE_MACHINE_ARN || "",
    bedrockModelId: process.env.AWS_BEDROCK_MODEL_ID || "",
    kmsKeyArn: process.env.AWS_KMS_KEY_ARN || ""
  };
}
