import type { AudioAsset } from "@/lib/types";

const staticDemoAudioPrefix = "/demo-audio/";
const rangeServedDemoAudioPrefix = "/api/demo-audio/";

export function toRangeServedDemoAudioUrl(storageUrl?: string) {
  if (!storageUrl?.startsWith(staticDemoAudioPrefix)) {
    return storageUrl;
  }

  return storageUrl.replace(staticDemoAudioPrefix, rangeServedDemoAudioPrefix);
}

export function withRangeServedDemoAudioAsset<T extends AudioAsset | undefined>(audioAsset: T): T {
  if (!audioAsset?.storageUrl) {
    return audioAsset;
  }

  return {
    ...audioAsset,
    storageUrl: toRangeServedDemoAudioUrl(audioAsset.storageUrl)
  } as T;
}

export function withRangeServedDemoAudioAssets(audioAssets: AudioAsset[]) {
  return audioAssets.map((audioAsset) => withRangeServedDemoAudioAsset(audioAsset));
}
