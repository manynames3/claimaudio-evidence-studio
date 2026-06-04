"use client";

import { BellDot, Cloud, Database, KeyRound, LockKeyhole, ScrollText, Search, ShieldAlert, ShieldCheck, UserCog, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { AuditLogPanel } from "@/components/audit-log-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useClaimAudioStore } from "@/lib/store/use-claim-audio-store";

const settings = [
  {
    title: "Role-based access",
    description: "Adjuster, supervisor, SIU, paralegal, attorney, manager, and admin role boundaries.",
    icon: UserCog,
    enabled: true,
    note: "Pilot sessions enforce role-aware API and UI checks. Replace access-code auth with Cognito/Auth0 groups before broad production rollout."
  },
  {
    title: "Retention policy",
    description: "Configurable claim audio, transcript, export, and audit log retention windows.",
    icon: ScrollText,
    enabled: false,
    note: "Not enforced yet. Add retention jobs, deletion workflows, and legal hold exceptions before confidential customer rollout."
  },
  {
    title: "No model training on customer data",
    description: "Customer recordings and claim materials are excluded from model training workflows.",
    icon: ShieldCheck,
    enabled: true,
    note: "Operational policy for pilot use. Confirm vendor terms, customer DPA language, and Bedrock account settings before production contracting."
  },
  {
    title: "Audit log",
    description: "Track uploads, transcript generation, AI finding validation, edits, approvals, exports, and downloads.",
    icon: LockKeyhole,
    enabled: true,
    note: "Audit events are persisted in Neon and scoped by tenant. Append-only enforcement and SIEM export are still planned."
  }
];

export default function SettingsPage() {
  const auditEvents = useClaimAudioStore((state) => state.auditEvents);
  const loadAuditEvents = useClaimAudioStore((state) => state.loadAuditEvents);
  const [backendStatus, setBackendStatus] = useState<BackendHealthResponse>();

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/health")
      .then((response) => response.json() as Promise<BackendHealthResponse>)
      .then((data) => {
        if (!cancelled) {
          setBackendStatus(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendStatus(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadAuditEvents();
  }, [loadAuditEvents]);

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="info">Security</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Settings and Security</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Pilot controls and production readiness indicators for claim data handling. Active controls are separated from items that still need enterprise hardening.
        </p>
      </div>

      <BackendStatusPanel status={backendStatus} />

      <ConfidentialFileGate status={backendStatus} />

      <div className="grid gap-4 xl:grid-cols-2">
        {settings.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title}>
              <CardHeader className="border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-900">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{item.title}</CardTitle>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Switch checked={item.enabled} disabled />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm leading-6 text-slate-700">{item.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="rounded-lg border bg-white">
        <div className="border-b p-5">
          <h2 className="text-base font-semibold">Production infrastructure notes</h2>
          <p className="mt-2 text-sm text-muted-foreground">Current pilot services plus the remaining hardening path for production claim data.</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <IntegrationNote
            icon={Cloud}
            title="S3 + KMS"
            text="Encrypted claim audio storage, tenant-scoped object keys, signed upload URLs, and signed export downloads."
          />
          <IntegrationNote
            icon={KeyRound}
            title="Cognito/Auth0"
            text="Authentication, org membership, role claims, and customer-managed access policies."
          />
          <IntegrationNote
            icon={Workflow}
            title="SQS + Step Functions"
            text="Async statement processing from upload through transcription, analysis, validation, and export."
          />
          <IntegrationNote
            icon={ShieldCheck}
            title="Bedrock guardrails"
            text="Structured evidence extraction with exact quote and timestamp validation before findings appear."
          />
          <IntegrationNote
            icon={ScrollText}
            title="Amazon Transcribe"
            text="Transcribe or Transcribe Call Analytics for diarized transcripts, segment confidence, and timestamp metadata."
          />
          <IntegrationNote
            icon={Database}
            title="Neon Postgres"
            text="Free-tier pilot database for tenant-scoped claim, audio, transcript, finding, clip, export, and audit trail tables."
          />
          <IntegrationNote
            icon={BellDot}
            title="CloudWatch logs"
            text="Operational logs, processing failures, job correlation IDs, and service health monitoring."
          />
          <IntegrationNote
            icon={Search}
            title="OpenSearch optional"
            text="Transcript and finding search, semantic retrieval, and future vector search for claim review workflows."
          />
        </div>
      </section>

      <AuditLogPanel events={auditEvents} title="Global Audit Log" />
    </div>
  );
}

interface BackendHealthResponse {
  backend: {
    backendMode: "mock" | "neon-aws";
    neonConfigured: boolean;
    awsConfigured: boolean;
    auth: {
      requireAuth: boolean;
      authConfigured: boolean;
      pilotAccessCodeConfigured: boolean;
      supervisorAccessCodeConfigured: boolean;
      adminAccessCodeConfigured: boolean;
      sessionSecretConfigured: boolean;
      tenantIdConfigured: boolean;
      authProvider: "pilot-cookie" | "disabled";
    };
    missingNeonEnv: string[];
    missingAwsEnv: string[];
  };
}

function BackendStatusPanel({ status }: { status?: BackendHealthResponse }) {
  const backend = status?.backend;
  const signedAuthReady = Boolean(backend?.auth.authProvider === "pilot-cookie" && backend.auth.authConfigured);
  const items = [
    {
      label: "Backend mode",
      value: backend?.backendMode || "checking",
      ready: backend?.backendMode === "neon-aws"
    },
    {
      label: "Pilot auth",
      value: !backend
        ? "checking"
        : signedAuthReady
          ? "signed sessions"
          : backend.auth.authProvider === "disabled"
            ? "disabled"
            : "demo defaults",
      ready: signedAuthReady
    },
    {
      label: "Supervisor code",
      value: backend?.auth.supervisorAccessCodeConfigured ? "configured" : "not set",
      ready: Boolean(backend?.auth.supervisorAccessCodeConfigured)
    },
    {
      label: "Neon Postgres",
      value: backend?.neonConfigured ? "configured" : "mock only",
      ready: Boolean(backend?.neonConfigured)
    },
    {
      label: "AWS services",
      value: backend?.awsConfigured ? "configured" : "pending env",
      ready: Boolean(backend?.awsConfigured)
    }
  ];

  return (
    <section className="rounded-lg border bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">Pilot Backend Readiness</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Neon stores claim/project data. AWS handles encrypted audio, async processing, transcription, analysis, exports, and operational logs.
          </p>
        </div>
        <Badge variant={backend?.neonConfigured ? "success" : "warning"}>
          {backend?.neonConfigured ? "Neon ready" : "Local mock mode"}
        </Badge>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{item.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {item.ready ? "Configured for this deployment." : "Needs setup before external pilot use."}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConfidentialFileGate({ status }: { status?: BackendHealthResponse }) {
  const backend = status?.backend;
  const signedSessionReady = Boolean(backend?.auth.authProvider === "pilot-cookie" && backend.auth.authConfigured);
  const tenantScopeReady = Boolean(backend?.auth.tenantIdConfigured);
  const readyForControlledPilot = Boolean(
    backend?.backendMode === "neon-aws" &&
      signedSessionReady &&
      tenantScopeReady &&
      backend.neonConfigured &&
      backend.awsConfigured
  );
  const gates = [
    {
      label: "Neon/AWS backend mode",
      ready: Boolean(backend?.backendMode === "neon-aws")
    },
    {
      label: "Signed pilot sessions",
      ready: signedSessionReady
    },
    {
      label: "Tenant scope",
      ready: tenantScopeReady
    },
    {
      label: "Persistent claim database",
      ready: Boolean(backend?.neonConfigured)
    },
    {
      label: "Encrypted upload and processing",
      ready: Boolean(backend?.awsConfigured)
    },
    {
      label: "Audit trail",
      ready: Boolean(backend?.neonConfigured)
    }
  ];

  return (
    <section className="rounded-lg border bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {readyForControlledPilot ? (
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-700" />
            )}
            <h2 className="text-base font-semibold">Confidential File Gate</h2>
            <Badge variant={readyForControlledPilot ? "success" : "warning"}>
              {readyForControlledPilot ? "Controlled pilot ready" : "Sample-only until configured"}
            </Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Customer claim recordings should be uploaded only when signed sessions, tenant scoping, Neon persistence, AWS encrypted storage, and Transcribe processing are configured for this deployment.
          </p>
        </div>
        <div className="grid min-w-[300px] gap-2">
          {gates.map((gate) => (
            <div key={gate.label} className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-700">{gate.label}</span>
              <Badge variant={gate.ready ? "success" : "warning"}>{gate.ready ? "Ready" : "Required"}</Badge>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IntegrationNote({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <article className="rounded-md border bg-slate-50 p-4">
      <Icon className="h-5 w-5 text-cyan-800" />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}
