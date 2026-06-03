import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const shortcuts = [
  ["Space", "play/pause"],
  ["J", "back 10 seconds"],
  ["L", "forward 10 seconds"],
  ["A", "approve finding"],
  ["R", "reject finding"],
  ["C", "create clip"]
] as const;

export function KeyboardShortcutsTooltip() {
  return (
    <div className="group relative">
      <Button variant="outline" size="sm" type="button">
        <Keyboard className="h-4 w-4" />
        Shortcuts
      </Button>
      <div className="pointer-events-none absolute right-0 top-10 z-40 hidden w-64 rounded-lg border bg-white p-3 text-sm shadow-panel group-hover:block group-focus-within:block">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keyboard shortcuts</p>
        <div className="mt-3 space-y-2">
          {shortcuts.map(([key, action]) => (
            <div className="flex items-center justify-between gap-3" key={key}>
              <kbd className="rounded border bg-slate-50 px-2 py-1 font-mono text-xs text-slate-800">{key}</kbd>
              <span className="text-xs text-slate-600">{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
