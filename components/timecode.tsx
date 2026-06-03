import { formatTimecode, formatTimeRange } from "@/lib/utils/time";

interface TimecodeProps {
  start: number;
  end?: number;
}

export function Timecode({ start, end }: TimecodeProps) {
  return (
    <span className="font-mono text-xs tabular-nums text-slate-600">
      {typeof end === "number" ? formatTimeRange(start, end) : formatTimecode(start)}
    </span>
  );
}
