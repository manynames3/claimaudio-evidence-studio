import { NextRequest, NextResponse } from "next/server";
import { PILOT_SESSION_COOKIE } from "@/lib/server/auth-constants";
import { verifySessionToken } from "@/lib/server/session";

export async function middleware(request: NextRequest) {
  if (process.env.CLAIMAUDIO_REQUIRE_AUTH === "false") {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(PILOT_SESSION_COOKIE);

  if (sessionCookie?.value && (await verifySessionToken(sessionCookie.value))) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*"]
};
