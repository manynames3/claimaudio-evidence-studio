import { Clock, FileCheck2, HelpCircle, ListChecks, ShieldAlert, Zap } from "lucide-react";
import type { ProductValueMetrics } from "@/lib/utils/project-metrics";

const metricItems = [
  {
    key: "manualSummaryTimeEstimate",
    label: "Manual summary",
    icon: Clock
  },
  {
    key: "aiAssistedReviewTimeEstimate",
    label: "AI-assisted review",
    icon: Zap
  },
  {
    key: "findingsDetected",
    label: "Findings detected",
    icon: ListChecks
  },
  {
    key: "findingsApproved",
    label: "Approved evidence",
    icon: FileCheck2
  },
  {
    key: "contradictionsFound",
    label: "Contradictions",
    icon: ShieldAlert
  },
  {
    key: "followUpQuestionsGenerated",
    label: "Follow-ups",
    icon: HelpCircle
  }
] as const;

interface ValueMetricsStripProps {
  metrics: ProductValueMetrics;
}

export function ValueMetricsStrip({ metrics }: ValueMetricsStripProps) {
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metricItems.map((item) => {
        const Icon = item.icon;
        const value = metrics[item.key];

        return (
          <div className="rounded-lg border bg-white px-3 py-2 shadow-panel" key={item.key}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <Icon className="h-4 w-4 text-cyan-800" />
            </div>
            <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{value}</p>
          </div>
        );
      })}
    </section>
  );
}
