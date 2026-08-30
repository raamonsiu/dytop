import { fetchLyrics as fetchFromLrclib } from "./lrclibClient";
import { fetchLyrics as fetchFromLyricsOvh } from "./lyricsOvhClient";
import type { LyricsProviderFetch, LyricsResult } from "./types";

/**
 * Providers tried in order until one has lyrics. A second (or third) source
 * is a new entry here, not a change to the loop in `fetchLyrics` below.
 */
export const LYRICS_PROVIDERS: LyricsProviderFetch[] = [fetchFromLrclib, fetchFromLyricsOvh];

/**
 * Tries each provider in order and stops at the first synced or plain result.
 *
 * A provider being down, out of quota, or simply not having this track are
 * all reasons to move on to the next one rather than give up — that's the
 * whole point of having more than one.
 *
 * If every provider comes back empty, "not-found" wins over "error": at
 * least one of them gave a confident answer, which is more useful to show
 * than the failure of a different one.
 */
export async function fetchLyrics(
  artist: string,
  title: string,
  signal?: AbortSignal,
  providers: LyricsProviderFetch[] = LYRICS_PROVIDERS,
): Promise<LyricsResult> {
  let sawNotFound = false;

  for (const fetchFromProvider of providers) {
    if (signal?.aborted) return { status: "not-found" };

    const result = await fetchFromProvider(artist, title, signal);
    if (result.status === "synced" || result.status === "plain") return result;
    if (result.status === "not-found") sawNotFound = true;
  }

  return sawNotFound ? { status: "not-found" } : { status: "error" };
}
