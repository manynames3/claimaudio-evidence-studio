"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock, FileCheck2, Inbox, ListChecks, Plus, Search, ShieldAlert } from "lucide-react";
import { ClaimProjectQueue } from "@/components/claim-project-queue";
import { DemoBanner } from "@/components/demo-banner";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { useClaimAudioStore } from "@/lib/store/use-claim-audio-store";
import { cn } from "@/lib/utils";

const filters = [
  { id: "readyForReview", label: "Ready for review" },
  { id: "needsSupervisorReview", label: "Supervisor review" },
  { id: "siuFlagged", label: "SIU flagged" },
  { id: "draftMemoReady", label: "Memo ready" }
] as const;

export default function DashboardPage() {
  const { projects, audioAssets, findings, backendMode, lastSyncError, loadDashboardData } = useClaimAudioStore();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const dashboardMetrics = useMemo(() => {
    const statementsReady = projects.filter((project) => project.reviewFlags.readyForReview).length;
    const pendingFindings = findings.filter((finding) => finding.reviewStatus === "pending").length;
    const approvedFindings = findings.filter((finding) => finding.reviewStatus === "approved").length;
    const supervisorPackets = projects.filter((project) => project.reviewFlags.needsSupervisorReview).length;

    return {
      statementsReady,
      averageReviewTimeSaved: "74 min",
      pendingFindings,
      approvedFindings,
      supervisorPackets
    };
  }, [findings, projects]);

  const filterCounts = useMemo(
    () => ({
      all: projects.length,
      readyForReview: projects.filter((project) => project.reviewFlags.readyForReview).length,
      needsSupervisorReview: projects.filter((project) => project.reviewFlags.needsSupervisorReview).length,
      siuFlagged: projects.filter((project) => project.reviewFlags.siuFlagged).length,
      draftMemoReady: projects.filter((project) => project.reviewFlags.draftMemoReady).length
    }),
    [projects]
  );

  const filteredProjects = projects.filter((project) => {
    const matchesFilter =
      activeFilter === "all" || project.reviewFlags[activeFilter as keyof typeof project.reviewFlags];
    const normalizedSearch = search.toLowerCase();
    const matchesSearch =
      !search ||
      project.claimNumber.toLowerCase().includes(normalizedSearch) ||
      project.claimantName.toLowerCase().includes(normalizedSearch) ||
      project.insuredName.toLowerCase().includes(normalizedSearch);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5">
      <DemoBanner />

      <section className="rounded-lg border bg-white px-4 py-3 shadow-panel">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="min-w-0">
            <Badge variant="info">Claim projects</Badge>
            <Badge className="ml-2" variant={backendMode === "neon" ? "success" : "neutral"}>
              {backendMode === "neon" ? "Pilot backend ready" : "Sample demo data"}
            </Badge>
            <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-950">
              Evidence review queue
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredProjects.length} of {projects.length} projects shown | {findings.length} evidence findings tracked
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/app/projects/claim-7842/workspace" className={buttonVariants({ variant: "outline" })}>
              Open guided sample
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/app/projects/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" />
              New Claim Project
            </Link>
          </div>
        </div>
        {lastSyncError && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            Backend sync note: {lastSyncError}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          icon={FileCheck2}
          label="Statements ready"
          value={dashboardMetrics.statementsReady.toString()}
          helper="Ready for evidence review"
        />
        <MetricCard
          icon={Clock}
          label="Average review time saved"
          value={dashboardMetrics.averageReviewTimeSaved}
          helper="Estimated vs. manual review"
        />
        <MetricCard
          icon={ListChecks}
          label="Unreviewed AI findings"
          value={dashboardMetrics.pendingFindings.toString()}
          helper="Need human decision"
        />
        <MetricCard
          icon={ShieldAlert}
          label="Supervisor packets"
          value={dashboardMetrics.supervisorPackets.toString()}
          helper={`${dashboardMetrics.approvedFindings} evidence items approved`}
        />
      </div>

      <section className="rounded-lg border bg-white">
        <div className="flex flex-col justify-between gap-3 border-b p-3 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Claim review work queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan by claim, party, status, evidence count, and next action.
            </p>
          </div>
          <div className="relative w-full shrink-0 xl:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search claim, claimant, insured"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col justify-between gap-3 border-b bg-slate-50/70 p-3 xl:flex-row xl:items-center">
          <div className="claims-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            <button
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                activeFilter === "all" ? "border-cyan-800 bg-white text-cyan-950" : "bg-white text-slate-600"
              )}
              onClick={() => setActiveFilter("all")}
            >
              All projects
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{filterCounts.all}</span>
            </button>
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  activeFilter === filter.id
                    ? "border-cyan-800 bg-white text-cyan-950"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  {filterCounts[filter.id]}
                </span>
              </button>
            ))}
          </div>
          <Badge variant={backendMode === "neon" ? "success" : "neutral"}>
            {backendMode === "neon" ? "Synced pilot data" : "Sample data"}
          </Badge>
        </div>
        <div className="p-3">
          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No projects match this view"
              description="Clear the search or choose a different review filter to show available claim projects."
            />
          ) : (
            <ClaimProjectQueue projects={filteredProjects} audioAssets={audioAssets} findings={findings} />
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xs font-medium uppercase leading-5 text-muted-foreground">{label}</CardTitle>
          <Icon className="h-4 w-4 text-cyan-800" />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
