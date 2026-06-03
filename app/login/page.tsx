"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AudioLines, LockKeyhole, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell isLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/app", [searchParams]);
  const [email, setEmail] = useState("pilot-reviewer@claimaudio.local");
  const [displayName, setDisplayName] = useState("Pilot Reviewer");
  const [accessCode, setAccessCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(undefined);

    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          displayName,
          accessCode
        })
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to start pilot session.");
      }

      window.location.assign(nextPath.startsWith("/app") ? nextPath : "/app");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to start pilot session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LoginShell>
        <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-5 shadow-panel">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Start pilot session</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the pilot access code provided for this workspace.
            </p>
          </div>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setError(undefined);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(undefined);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessCode">Pilot access code</Label>
              <Input
                id="accessCode"
                type="password"
                value={accessCode}
                onChange={(event) => {
                  setAccessCode(event.target.value);
                  setError(undefined);
                }}
                placeholder="Enter pilot code"
                required
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Your role and permissions are assigned by this code.
              </p>
            </div>
            {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Starting session..." : "Enter workspace"}
            </Button>
          </div>
        </form>
    </LoginShell>
  );
}

function LoginShell({
  children,
  isLoading
}: {
  children?: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-5">
          <Badge variant="info">Pilot access</Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              ClaimAudio Evidence Studio
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Controlled access for reviewing recorded statements, approving quote-backed findings, and exporting claim-file work product.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <ReadinessTile icon={AudioLines} title="Recorded statement" text="Upload or select a sample statement." />
            <ReadinessTile icon={ShieldCheck} title="Human review" text="Approve evidence before export." />
            <ReadinessTile icon={LockKeyhole} title="Tenant scoped" text="Pilot sessions are signed and org-scoped." />
          </div>
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            Use customer-approved pilot files only. Production identity, retention, and legal hold controls should be finalized before broad confidential claim-file rollout.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-lg border bg-white p-5 text-sm text-muted-foreground shadow-panel">
            Loading pilot access...
          </div>
        ) : (
          children
        )}
      </section>
    </main>
  );
}

function ReadinessTile({
  icon: Icon,
  title,
  text
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-md border bg-white p-4">
      <Icon className="h-5 w-5 text-cyan-800" />
      <h3 className="mt-3 text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{text}</p>
    </article>
  );
}
