"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Scissors, StepBack, StepForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timecode } from "@/components/timecode";
import { cn } from "@/lib/utils";
import { formatTimecode, secondsToPercent } from "@/lib/utils/time";
import type { AudioAsset, EvidenceFinding } from "@/lib/types";

interface WaveformPlayerProps {
  audioAsset: AudioAsset;
  findings: EvidenceFinding[];
  currentTimeSeconds: number;
  selectedRange: {
    startTimeSeconds: number;
    endTimeSeconds: number;
  };
  onTimeChange: (seconds: number) => void;
  onFindingMarkerClick: (finding: EvidenceFinding) => void;
  onCreateClip: () => void;
}

export function WaveformPlayer({
  audioAsset,
  findings,
  currentTimeSeconds,
  selectedRange,
  onTimeChange,
  onFindingMarkerClick,
  onCreateClip
}: WaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const audioSrc =
    audioAsset.storageUrl?.startsWith("/") || audioAsset.storageUrl?.startsWith("https://")
      ? audioAsset.storageUrl
      : undefined;
  const bars = useMemo(
    () =>
      Array.from({ length: 96 }, (_, index) => {
        const wave = Math.sin(index * 0.52) * 24 + Math.cos(index * 0.17) * 12;
        return Math.round(Math.max(18, Math.min(88, 48 + wave + ((index * 13) % 19))));
      }),
    []
  );
  const clampTime = useCallback(
    (seconds: number) => Math.min(audioAsset.durationSeconds, Math.max(0, seconds)),
    [audioAsset.durationSeconds]
  );
  const seekAudioElement = useCallback(
    (seconds: number) => {
      const targetTime = clampTime(seconds);
      const audio = audioRef.current;

      pendingSeekRef.current = targetTime;

      if (!audio || !audioSrc) {
        return targetTime;
      }

      const applySeek = () => {
        try {
          audio.currentTime = targetTime;
        } catch {
          // The loadedmetadata handler will retry if the browser is not ready to seek yet.
        }
      };

      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        applySeek();
      } else {
        audio.addEventListener("loadedmetadata", applySeek, { once: true });
      }

      return targetTime;
    },
    [audioSrc, clampTime]
  );
  const handleSeek = useCallback(
    (seconds: number) => {
      const targetTime = seekAudioElement(seconds);

      onTimeChange(targetTime);
    },
    [onTimeChange, seekAudioElement]
  );
  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || !audioSrc) {
      setIsPlaying((playing) => !playing);
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    seekAudioElement(currentTimeSeconds);

    void audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [audioSrc, currentTimeSeconds, isPlaying, seekAudioElement]);

  useEffect(() => {
    if (audioSrc) {
      return;
    }

    if (!isPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      const nextTime = currentTimeSeconds + 1;
      if (nextTime >= audioAsset.durationSeconds) {
        setIsPlaying(false);
        onTimeChange(audioAsset.durationSeconds);
      } else {
        onTimeChange(nextTime);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [audioAsset.durationSeconds, audioSrc, currentTimeSeconds, isPlaying, onTimeChange]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !audioSrc) {
      return;
    }

    const handleTimeUpdate = () => {
      const pendingSeek = pendingSeekRef.current;

      if (pendingSeek !== null && Math.abs(audio.currentTime - pendingSeek) > 0.35) {
        return;
      }

      pendingSeekRef.current = null;
      onTimeChange(audio.currentTime);
    };
    const handleSeeked = () => {
      pendingSeekRef.current = null;
      onTimeChange(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      onTimeChange(audio.duration || audioAsset.durationSeconds);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("seeked", handleSeeked);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("seeked", handleSeeked);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioAsset.durationSeconds, audioSrc, onTimeChange]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !audioSrc) {
      return;
    }

    if (Math.abs(audio.currentTime - currentTimeSeconds) > 0.4) {
      seekAudioElement(currentTimeSeconds);
    }
  }, [audioSrc, currentTimeSeconds, seekAudioElement]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();

      if (tagName === "input" || tagName === "textarea" || tagName === "select") {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      }

      if (event.key.toLowerCase() === "j") {
        handleSeek(currentTimeSeconds - 10);
      }

      if (event.key.toLowerCase() === "l") {
        handleSeek(currentTimeSeconds + 10);
      }

      if (event.key.toLowerCase() === "c") {
        onCreateClip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTimeSeconds, handleSeek, onCreateClip, togglePlayback]);

  const progressPercent = secondsToPercent(currentTimeSeconds, audioAsset.durationSeconds);
  const rangeLeft = secondsToPercent(selectedRange.startTimeSeconds, audioAsset.durationSeconds);
  const rangeWidth = Math.max(
    1,
    secondsToPercent(selectedRange.endTimeSeconds - selectedRange.startTimeSeconds, audioAsset.durationSeconds)
  );

  // TODO: Replace this mock waveform adapter with WaveSurfer.js or a real waveform service once S3 audio is available.
  return (
    <section className="rounded-lg border bg-white">
      {audioSrc ? (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const audio = event.currentTarget;
            const targetTime = pendingSeekRef.current ?? currentTimeSeconds;

            if (Math.abs(audio.currentTime - targetTime) > 0.4) {
              audio.currentTime = clampTime(targetTime);
            }
          }}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="text-sm font-semibold">Recorded Statement Player</h2>
          <p className="mt-1 text-xs text-muted-foreground">{audioAsset.fileName}</p>
        </div>
        <div className="flex items-center gap-2">
          {audioSrc ? <Badge variant="info">Preloaded audio</Badge> : null}
          <Badge variant="success">Ready for review</Badge>
          <Timecode start={currentTimeSeconds} />
          <span className="text-xs text-muted-foreground">/ {formatTimecode(audioAsset.durationSeconds)}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="relative h-44 rounded-md border bg-slate-950 px-3 py-4">
          <div className="absolute left-3 right-3 top-3 flex justify-between text-[10px] font-medium text-slate-400">
            <span>0:00</span>
            <span>Evidence timeline</span>
            <span>{formatTimecode(audioAsset.durationSeconds)}</span>
          </div>
          <div className="absolute inset-x-3 bottom-8 top-7 flex items-end gap-1">
            {bars.map((height, index) => {
              const barPercent = (index / bars.length) * 100;
              const played = barPercent <= progressPercent;

              return (
                <div
                  key={index}
                  className={cn(
                    "flex-1 rounded-sm transition-colors",
                    played ? "bg-cyan-300" : "bg-slate-600"
                  )}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
          <button
            type="button"
            aria-label="Seek waveform"
            data-testid="waveform-seek-hit-area"
            title="Click waveform to seek"
            className="absolute inset-x-3 bottom-8 top-7 z-10 cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const clickPercent = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;

              handleSeek(clickPercent * audioAsset.durationSeconds);
            }}
          />
          <div
            className="pointer-events-none absolute top-7 h-[calc(100%-3.5rem)] rounded-sm bg-amber-300/20 ring-1 ring-amber-200"
            style={{ left: `${rangeLeft}%`, width: `${rangeWidth}%` }}
          />
          <div
            className="pointer-events-none absolute top-6 h-[calc(100%-3rem)] w-0.5 bg-white shadow"
            style={{ left: `${progressPercent}%` }}
          />
          {findings.map((finding) => {
            const left = secondsToPercent(finding.startTimeSeconds, audioAsset.durationSeconds);

            return (
              <button
                key={finding.id}
                onClick={() => onFindingMarkerClick(finding)}
                title={`${finding.category}: ${finding.title}`}
                className={cn(
                  "absolute bottom-3 h-5 w-1.5 rounded-full transition-transform hover:scale-125",
                  finding.severity === "high"
                    ? "bg-red-400"
                    : finding.severity === "medium"
                      ? "bg-amber-300"
                      : "bg-emerald-300"
                )}
                style={{ left: `${left}%` }}
              />
            );
          })}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-slate-400">
            <span>Finding markers: high, medium, low severity</span>
            <span>{findings.length} AI markers</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              title="Back 10 seconds"
              onClick={() => handleSeek(currentTimeSeconds - 10)}
            >
              <StepBack className="h-4 w-4" />
            </Button>
            <Button size="icon" title={isPlaying ? "Pause" : "Play"} onClick={togglePlayback}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              title="Forward 10 seconds"
              onClick={() => handleSeek(currentTimeSeconds + 10)}
            >
              <StepForward className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">
              Selected range
              <span className="ml-1">
                <Timecode start={selectedRange.startTimeSeconds} end={selectedRange.endTimeSeconds} />
              </span>
            </Badge>
            <Button onClick={onCreateClip} variant="outline">
              <Scissors className="h-4 w-4" />
              Create clip
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
