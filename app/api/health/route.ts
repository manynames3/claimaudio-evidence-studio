import { jsonOk } from "@/lib/server/api";
import { getRequestAuthContext } from "@/lib/server/auth";
import { getRuntimeBackendStatus } from "@/lib/server/env";

export async function GET(request: Request) {
  const auth = await getRequestAuthContext(request);
  const backend = getRuntimeBackendStatus();

  if (!auth && process.env.CLAIMAUDIO_REQUIRE_AUTH !== "false") {
    return jsonOk({
      app: "ClaimAudio Evidence Studio",
      status: "ok",
      authenticated: false,
      authRequired: true
    });
  }

  return jsonOk({
    app: "ClaimAudio Evidence Studio",
    status: "ok",
    authenticated: Boolean(auth),
    backend
  });
}
