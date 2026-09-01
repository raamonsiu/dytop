import { createStore, useStore } from "@/lib/createStore";
import { setPref } from "@/lib/prefs";
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
 * Id of the track lyrics were last loaded for, so a manual delay/offset
 * nudge can be reset exactly once per genuine track change. Callers such as
 * the radio's periodic re-sync call `loadLyricsFor` again for the *same*
 * track (id unchanged), which must not clobber a delay the user just set.
 */
let lastTrackId: string | null = null;

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

  const trackId = track?.id ?? null;
  if (trackId !== lastTrackId) {
    // The delay is a per-track manual correction (e.g. a laggy upload's
    // intro), not a listening preference, so it should not carry over to the
    // next song. Keyed on id rather than firing on every call, since callers
    // like the radio's tick-driven refresh re-invoke this for the still-
    // playing track without an actual change.
    lastTrackId = trackId;
    setPref("lyricsDelay", 0);
  }

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
