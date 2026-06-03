export function formatTimecode(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTimeRange(startTimeSeconds: number, endTimeSeconds: number) {
  return `${formatTimecode(startTimeSeconds)}-${formatTimecode(endTimeSeconds)}`;
}

export function secondsToPercent(seconds: number, durationSeconds: number): number {
  if (!durationSeconds) {
    return 0;
  }

  return Math.min(100, Math.max(0, (seconds / durationSeconds) * 100));
}
