"use client";

import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const demoSteps = [
  "This is the recorded statement.",
  "AI extracted claim-relevant evidence.",
  "Every finding includes exact quote and timestamp.",
  "Click to jump to waveform proof.",
  "Approve findings for the claim file.",
  "Export the evidence memo."
] as const;

interface GuidedDemoProps {
  onStepChange?: (stepIndex: number) => void;
}

export function GuidedDemo({ onStepChange }: GuidedDemoProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = demoSteps[stepIndex];

  const setStep = (nextIndex: number) => {
    setStepIndex(nextIndex);
    onStepChange?.(nextIndex);
  };

  return (
    <section className="rounded-lg border bg-white px-3 py-2 shadow-panel">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant="info">Guided demo</Badge>
          <span className="text-xs font-medium text-muted-foreground">
            {stepIndex + 1}/{demoSteps.length}
          </span>
          <h2 className="truncate text-sm font-semibold text-slate-950">{currentStep}</h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {demoSteps.map((step, index) => {
              const active = index === stepIndex;

              return (
                <button
                  key={step}
                  aria-label={`Demo step ${index + 1}`}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    active ? "bg-cyan-800" : "bg-slate-300 hover:bg-slate-400"
                  }`}
                  onClick={() => setStep(index)}
                />
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(0)}
            disabled={stepIndex === 0}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => setStep(Math.min(demoSteps.length - 1, stepIndex + 1))}
            disabled={stepIndex === demoSteps.length - 1}
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
