import type { UserRole } from "@/lib/types";

export interface ClientSessionUser {
  tenantId: string;
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  authProvider: "pilot-cookie" | "disabled";
}

export async function getClientSession() {
  const response = await fetch("/api/auth/session");
  const data = (await response.json()) as {
    authenticated: boolean;
    user: ClientSessionUser | null;
  };

  if (!response.ok) {
    throw new Error("Unable to load session.");
  }

  return data;
}

export async function endClientSession() {
  const response = await fetch("/api/auth/session", {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Unable to end session.");
  }
}
