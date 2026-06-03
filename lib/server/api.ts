import { NextResponse } from "next/server";
import { canUseRole, getRequestAuthContext } from "@/lib/server/auth";
import { getRuntimeBackendStatus } from "@/lib/server/env";
import type { AuthContext } from "@/lib/server/auth";
import type { UserRole } from "@/lib/types";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      details
    },
    { status }
  );
}

export function assertNeonConfigured() {
  const status = getRuntimeBackendStatus();

  if (!status.neonConfigured) {
    return jsonError(
      "Neon Postgres is not configured. Set DATABASE_URL to enable persistent backend routes.",
      503,
      { missingEnv: status.missingNeonEnv }
    );
  }

  return null;
}

export type AuthGuardResult =
  | {
      ok: true;
      auth: AuthContext;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireAuth(
  request: Request,
  allowedRoles?: Set<UserRole>
): Promise<AuthGuardResult> {
  const auth = await getRequestAuthContext(request);

  if (!auth) {
    return {
      ok: false,
      response: jsonError("Authentication required.", 401)
    };
  }

  if (!canUseRole(auth, allowedRoles)) {
    return {
      ok: false,
      response: jsonError("You do not have permission to perform this action.", 403, {
        requiredRoles: allowedRoles ? Array.from(allowedRoles) : undefined,
        currentRole: auth.role
      })
    };
  }

  return {
    ok: true,
    auth
  };
}
