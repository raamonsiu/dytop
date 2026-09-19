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
 * Id of the track lyrics were last loaded for: what tells a genuine track
 * change from a caller re-asking for the one already showing.
 *
 * Callers such as the radio's heal re-invoke `loadLyricsFor` for the *same*
 * track (id unchanged) many times per song. That must neither refetch the
 * document nor clobber a delay the user just set, since the delay is a manual
 * correction for this upload rather than a listening preference.
 */
let lastTrackId: string | null = null;

/**
 * Loads lyrics for a track, replacing whatever was showing.
 *
 * Skipping quickly through a queue fires several lookups; without cancelling,
 * a slow earlier response could land after a faster later one and leave the
 * wrong lyrics on screen. The result is also checked against the request that
 * is still current, since an abort isn't guaranteed to win the race.
 *
 * Re-asking for the track already on screen is a no-op. Radio calls this from
 * every heal, and a heal is not only a track boundary: a tab refocus or the
 * midnight re-sync both fire one mid-song. Aborting the settled lookup to run
 * it again dropped the lyrics back to "loading" and refetched them for nothing,
 * which is why simply returning to the tab wiped the words off the screen.
 *
 * A previous *failure* is the one state worth repeating: a heal is exactly the
 * moment a transient outage deserves another attempt.
 */
export function loadLyricsFor(track: Track | null): void {
  const trackId = track?.id ?? null;
  const sameTrack = trackId === lastTrackId;
  if (sameTrack && lyricsStore.get().status !== "error") return;

  controller?.abort();

  if (!sameTrack) {
    // A per-track manual correction (e.g. for a laggy upload's intro), not a
    // listening preference, so it must not carry over to the next song.
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
