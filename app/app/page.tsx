"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock, FileCheck2, Inbox, ListChecks, Plus, Search, ShieldAlert } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { EmptyState } from "@/components/empty-state";
import { ProjectCard } from "@/components/project-card";
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
  const { projects, audioAssets, findings, backendMode, isHydrating, lastSyncError, loadDashboardData } = useClaimAudioStore();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const dashboardMetrics = useMemo(() => {
    const reviewedRecordings = projects.filter((project) => project.reviewFlags.readyForReview).length;
    const pendingFindings = findings.filter((finding) => finding.reviewStatus === "pending").length;
    const approvedFindings = findings.filter((finding) => finding.reviewStatus === "approved").length;

    return {
      reviewedRecordings,
      averageReviewTimeSaved: "74 min",
      pendingFindings,
      approvedFindings
    };
  }, [findings, projects]);

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
    <div className="space-y-6">
      <DemoBanner />

      <section className="rounded-lg border bg-white px-4 py-3 shadow-panel">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="min-w-0">
            <Badge variant="info">Claim projects</Badge>
            <Badge className="ml-2" variant={backendMode === "neon" ? "success" : "neutral"}>
              {backendMode === "neon" ? "Persistent pilot mode" : "Local mock mode"}
            </Badge>
            <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-950">
              Evidence review queue
            </h1>
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
        {(isHydrating || lastSyncError) && (
          <div className="mt-4 rounded-md border bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
            {isHydrating ? "Syncing claim projects..." : `Backend sync note: ${lastSyncError}`}
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={FileCheck2}
          label="Recordings reviewed"
          value={dashboardMetrics.reviewedRecordings.toString()}
        />
        <MetricCard
          icon={Clock}
          label="Average review time saved"
          value={dashboardMetrics.averageReviewTimeSaved}
        />
        <MetricCard
          icon={ListChecks}
          label="Pending findings"
          value={dashboardMetrics.pendingFindings.toString()}
        />
        <MetricCard
          icon={ShieldAlert}
          label="Approved evidence items"
          value={dashboardMetrics.approvedFindings.toString()}
        />
      </div>

      <section className="rounded-lg border bg-white">
        <div className="flex flex-col justify-between gap-3 border-b p-3 xl:flex-row xl:items-center">
          <div className="claims-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            <button
              className={cn(
                "shrink-0 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                activeFilter === "all" ? "border-cyan-800 bg-cyan-50 text-cyan-950" : "bg-white text-slate-600"
              )}
              onClick={() => setActiveFilter("all")}
            >
              All projects
            </button>
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={cn(
                  "shrink-0 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  activeFilter === filter.id
                    ? "border-cyan-800 bg-cyan-50 text-cyan-950"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
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
        <div className="grid gap-4 p-3 xl:grid-cols-3">
          {filteredProjects.length === 0 ? (
            <div className="xl:col-span-3">
              <EmptyState
                icon={Inbox}
                title="No projects match this view"
                description="Clear the search or choose a different review filter to show available claim projects."
              />
            </div>
          ) : (
            filteredProjects.map((project) => {
              const audioAsset = audioAssets.find((asset) => asset.id === project.audioAssetId);
              const projectFindings = findings.filter((finding) => finding.audioAssetId === project.audioAssetId);

              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  audioAsset={audioAsset}
                  findings={projectFindings}
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <Icon className="h-4 w-4 text-cyan-800" />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-2xl font-semibold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}
