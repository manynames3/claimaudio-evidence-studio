"use client";

import { AlertTriangle, Check, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProcessingRun, ProcessingStatus } from "@/lib/types";

const steps: Array<{ status: ProcessingStatus; label: string; description: string }> = [
  {
    status: "uploaded",
    label: "Uploaded",
    description: "Audio asset received and registered."
  },
  {
    status: "transcribing",
    label: "Transcribing",
    description: "Timestamped speaker transcript is being prepared."
  },
  {
    status: "analyzing",
    label: "Analyzing",
    description: "Evidence findings and contradictions are being extracted."
  },
  {
    status: "readyForReview",
    label: "Ready",
    description: "Evidence workspace is ready for human review."
  }
];

const stepOrder = steps.map((step) => step.status);

interface ProcessingStepperProps {
  processingRun?: ProcessingRun;
  onRetry?: () => void;
}

export function ProcessingStepper({ processingRun, onRetry }: ProcessingStepperProps) {
  const currentStatus = processingRun?.status || "uploaded";
  const currentIndex =
    currentStatus === "failed" ? -1 : Math.max(0, stepOrder.indexOf(currentStatus));

  return (
    <section className="rounded-lg border bg-white">
      <div className="border-b p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Processing</h2>
          <p className="text-xs text-muted-foreground">
            {currentStatus === "failed" ? "Failed" : steps[Math.max(0, currentIndex)]?.label || "Queued"}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {processingRun?.message || "Waiting for an audio asset to begin processing."}
        </p>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-4">
        {steps.map((step, index) => {
          const complete = currentStatus !== "failed" && index < currentIndex;
          const active = currentStatus !== "failed" && index === currentIndex;
          const ready = currentStatus === "readyForReview";

          return (
            <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-2 py-2" key={step.status}>
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  complete || (ready && step.status === "readyForReview")
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : active
                      ? "border-cyan-800 bg-cyan-50 text-cyan-900"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                )}
              >
                {complete || (ready && step.status === "readyForReview") ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{step.label}</p>
              </div>
            </div>
          );
        })}

        {processingRun?.status === "failed" && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 sm:col-span-4">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-700" />
              <div>
                <p className="text-sm font-semibold text-red-900">Processing error</p>
                <p className="mt-1 text-sm leading-5 text-red-800">
                  {processingRun.error || "The mock processing pipeline failed."}
                </p>
              </div>
            </div>
            {onRetry && (
              <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
