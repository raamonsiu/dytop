import { createStore, useStore } from "@/lib/createStore";
import type { Track } from "@/player/types";
import { fetchLyrics } from "./providers";
import type { LyricLine } from "./parseLRC";

export type LyricsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "synced"; lines: LyricLine[] }
  | { status: "plain"; text: string }
  | { status: "not-found" }
  | { status: "error" };

export const lyricsStore = createStore<LyricsState>({ status: "idle" });

/** Cancels the in-flight lookup when the track changes. */
let controller: AbortController | null = null;

/**
 * Loads lyrics for a track, replacing whatever was showing.
 *
 * Skipping quickly through a queue fires several lookups; without cancelling,
 * a slow earlier response could land after a faster later one and leave the
 * wrong lyrics on screen. The result is also checked against the request that
 * is still current, since an abort isn't guaranteed to win the race.
 */
export function loadLyricsFor(track: Track | null): void {
  controller?.abort();

  if (!track) {
    lyricsStore.set({ status: "idle" });
    return;
  }

  const current = new AbortController();
  controller = current;
  lyricsStore.set({ status: "loading" });

  void fetchLyrics(
    track.artistGuess,
    track.titleGuess || track.title,
    current.signal,
  ).then((result) => {
    if (controller !== current) return;
    lyricsStore.set(result);
  });
}

export function useLyrics(): LyricsState {
  return useStore(lyricsStore);
}
