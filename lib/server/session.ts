import {
  DEFAULT_PILOT_ACCESS_CODE,
  DEFAULT_PILOT_TENANT_ID
} from "@/lib/server/auth-constants";
import type { UserRole } from "@/lib/types";

export const sessionDurationSeconds = 60 * 60 * 10;

export interface SessionPayload {
  tenantId: string;
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  exp: number;
  nonce: string;
}

const roleValues = new Set<UserRole>([
  "adjuster",
  "supervisor",
  "siu",
  "defense_paralegal",
  "defense_attorney",
  "admin"
]);

export async function createSessionToken(input: {
  email: string;
  displayName?: string;
  role: UserRole;
}) {
  const email = normalizeEmail(input.email);
  const payload: SessionPayload = {
    tenantId: getTenantId(),
    userId: stableUserId(email),
    email,
    displayName: input.displayName?.trim() || email.split("@")[0] || "Pilot Reviewer",
    role: input.role,
    exp: Math.floor(Date.now() / 1000) + sessionDurationSeconds,
    nonce: crypto.randomUUID()
  };

  return signSession(payload);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await hmacSha256(encodedPayload);

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (!roleValues.has(payload.role) || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function validatePilotAccessCode(value: string) {
  return Boolean(resolvePilotAccessCode(value));
}

export function resolvePilotAccessCode(value: string): UserRole | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const codeMap: Array<[string | undefined, UserRole]> = [
    [process.env.CLAIMAUDIO_ADMIN_ACCESS_CODE, "admin"],
    [process.env.CLAIMAUDIO_SUPERVISOR_ACCESS_CODE, "supervisor"],
    [process.env.CLAIMAUDIO_PILOT_ACCESS_CODE || DEFAULT_PILOT_ACCESS_CODE, "adjuster"]
  ];

  return codeMap.find(([code]) => Boolean(code) && normalizedValue === code)?.[1] || null;
}

export function getTenantId() {
  return process.env.CLAIMAUDIO_TENANT_ID || DEFAULT_PILOT_TENANT_ID;
}

function getPilotAccessCode() {
  return process.env.CLAIMAUDIO_PILOT_ACCESS_CODE || DEFAULT_PILOT_ACCESS_CODE;
}

function getSessionSecret() {
  // TODO: Production auth should validate Cognito/Auth0 JWTs and avoid fallback secrets.
  return process.env.CLAIMAUDIO_SESSION_SECRET || `${getPilotAccessCode()}:claimaudio-local-session-secret`;
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return "pilot-reviewer@claimaudio.local";
  }

  return email;
}

function stableUserId(email: string) {
  return `pilot-${email.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`;
}

async function signSession(payload: SessionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacSha256(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

async function hmacSha256(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

function base64UrlEncode(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
