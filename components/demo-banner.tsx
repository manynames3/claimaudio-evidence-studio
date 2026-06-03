import { AlertTriangle } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
      <p>
        <span className="font-semibold">Pilot workspace.</span> Do not upload confidential claim files.
      </p>
    </div>
  );
}
