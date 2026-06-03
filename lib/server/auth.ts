import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  DEFAULT_PILOT_ACCESS_CODE,
  DEFAULT_PILOT_TENANT_ID,
  PILOT_SESSION_COOKIE
} from "@/lib/server/auth-constants";
import {
  createSessionToken,
  getTenantId,
  resolvePilotAccessCode,
  sessionDurationSeconds,
  validatePilotAccessCode,
  verifySessionToken
} from "@/lib/server/session";
import type { UserRole } from "@/lib/types";

export {
  DEFAULT_PILOT_ACCESS_CODE,
  DEFAULT_PILOT_TENANT_ID,
  PILOT_SESSION_COOKIE,
  resolvePilotAccessCode,
  validatePilotAccessCode
};

export interface AuthContext {
  tenantId: string;
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  authProvider: "pilot-cookie" | "disabled";
}

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

export const writableRoles = new Set<UserRole>([
  "adjuster",
  "supervisor",
  "siu",
  "defense_paralegal",
  "defense_attorney",
  "admin"
]);

export const supervisorRoles = new Set<UserRole>(["supervisor", "defense_attorney", "admin"]);
export const exportRoles = new Set<UserRole>(["adjuster", "supervisor", "siu", "defense_paralegal", "defense_attorney", "admin"]);
export const adminRoles = new Set<UserRole>(["admin"]);

export function getAuthRuntimeStatus(): AuthRuntimeStatus {
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

export async function createPilotSession(input: {
  email: string;
  displayName?: string;
  role: UserRole;
}) {
  return createSessionToken(input);
}

export async function getRequestAuthContext(request?: Request | NextRequest): Promise<AuthContext | null> {
  if (process.env.CLAIMAUDIO_REQUIRE_AUTH === "false") {
    return {
      tenantId: getTenantId(),
      userId: "demo-disabled-auth-user",
      email: "demo-reviewer@claimaudio.local",
      displayName: "Demo Reviewer",
      role: "admin",
      authProvider: "disabled"
    };
  }

  const token = await getSessionToken(request);

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  return {
    tenantId: payload.tenantId,
    userId: payload.userId,
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
    authProvider: "pilot-cookie"
  };
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds
  };
}

export function actorLabel(auth: AuthContext) {
  return `${auth.displayName} (${auth.role.replace("_", " ")})`;
}

export function canUseRole(auth: AuthContext, allowedRoles?: Set<UserRole>) {
  return !allowedRoles || allowedRoles.has(auth.role);
}

async function getSessionToken(request?: Request | NextRequest) {
  if (request) {
    const header = request.headers.get("cookie") || "";
    return parseCookie(header)[PILOT_SESSION_COOKIE];
  }

  const cookieStore = await cookies();
  return cookieStore.get(PILOT_SESSION_COOKIE)?.value;
}

function parseCookie(header: string) {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      })
  );
}
