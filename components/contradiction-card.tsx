"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Timecode } from "@/components/timecode";
import type { Contradiction } from "@/lib/types";

interface ContradictionCardProps {
  contradiction: Contradiction;
  onJump: (seconds: number) => void;
}

export function ContradictionCard({ contradiction, onJump }: ContradictionCardProps) {
  return (
    <article className="rounded-md border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
          <div>
            <h3 className="text-sm font-semibold">{contradiction.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{contradiction.whyItMatters}</p>
          </div>
        </div>
        <StatusBadge status={contradiction.reviewStatus} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-3">
          <Badge variant="neutral">Statement A</Badge>
          <p className="mt-2 text-sm leading-6 text-slate-700">{contradiction.statementA}</p>
          <blockquote className="mt-2 text-sm italic text-slate-800">"{contradiction.quoteA}"</blockquote>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => onJump(contradiction.timestampA)}>
            Jump to <Timecode start={contradiction.timestampA} />
          </Button>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <Badge variant="neutral">Statement B</Badge>
          <p className="mt-2 text-sm leading-6 text-slate-700">{contradiction.statementB}</p>
          <blockquote className="mt-2 text-sm italic text-slate-800">"{contradiction.quoteB}"</blockquote>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => onJump(contradiction.timestampB)}>
            Jump to <Timecode start={contradiction.timestampB} />
          </Button>
        </div>
      </div>
    </article>
  );
}
