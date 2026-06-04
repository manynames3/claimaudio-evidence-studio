import timingData from "@/lib/demo-audio/polly-demo-timings.json";
import { toRangeServedDemoAudioUrl } from "@/lib/demo-audio/audio-url";

export interface SampleStatementTimingLine {
  id: string;
  audioAssetId: string;
  speaker: "Adjuster" | "Claimant";
  text: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  confidence: number;
}

interface SampleStatementTimingData {
  generatedAt: string;
  provider: string;
  region: string;
  outputUrl: string;
  sampleRate: number;
  format: "wav";
  voices: Record<string, string>;
  durationSeconds: number;
  requestedCharacters: number;
  lines: SampleStatementTimingLine[];
}

const sampleStatementTimingData = timingData as SampleStatementTimingData;

export const sampleStatementAudioUrl = toRangeServedDemoAudioUrl(sampleStatementTimingData.outputUrl);
export const sampleStatementAudioDurationSeconds = Math.ceil(sampleStatementTimingData.durationSeconds);
export const sampleStatementTimingLines = sampleStatementTimingData.lines;
export const sampleStatementAudioProvider = sampleStatementTimingData.provider;
