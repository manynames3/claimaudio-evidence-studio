import { NextRequest, NextResponse } from "next/server";
import {
  createPilotSession,
  getRequestAuthContext,
  getSessionCookieOptions,
  PILOT_SESSION_COOKIE,
  resolvePilotAccessCode
} from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api";

type LoginRequest = {
  email: string;
  displayName?: string;
  accessCode: string;
};

export async function GET(request: NextRequest) {
  const auth = await getRequestAuthContext(request);

  return jsonOk({
    authenticated: Boolean(auth),
    user: auth
      ? {
          tenantId: auth.tenantId,
          userId: auth.userId,
          email: auth.email,
          displayName: auth.displayName,
          role: auth.role,
          authProvider: auth.authProvider
        }
      : null
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as LoginRequest;
  const role = resolvePilotAccessCode(body.accessCode || "");

  if (!role) {
    return jsonError("Invalid pilot access code.", 401);
  }

  // TODO: Replace pilot access-code auth with Cognito/Auth0 JWT validation and org membership lookup.
  const token = await createPilotSession({
    email: body.email,
    displayName: body.displayName,
    role
  });
  const response = NextResponse.json({ ok: true, role });

  response.cookies.set(PILOT_SESSION_COOKIE, token, getSessionCookieOptions());

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(PILOT_SESSION_COOKIE, "", {
    ...getSessionCookieOptions(),
    maxAge: 0
  });

  return response;
}
