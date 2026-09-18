import { fetchLyrics as fetchFromLrclib } from "./lrclibClient";
import { fetchLyrics as fetchFromLyricsOvh } from "./lyricsOvhClient";
import type { LyricsProviderFetch, LyricsResult } from "./types";

/**
 * Providers tried in order until one has lyrics. A second (or third) source
 * is a new entry here, not a change to the loop in `fetchLyrics` below.
 */
export const LYRICS_PROVIDERS: LyricsProviderFetch[] = [fetchFromLrclib, fetchFromLyricsOvh];

/**
 * The queries to try, most trustworthy first.
 *
 * `parseTitleGuess` reads "A - B" as artist then title, which is what most
 * uploads mean — but lyric-video channels invert it just as consistently
 * ("Tokyo (amb lletra) - Els Catarres", "IGUALES - Quevedo"), and nothing in
 * the string itself says which one you are holding. So rather than guess
 * harder, ask the natural reading of every provider first and only then try it
 * the other way round: a swap that hits is evidence the upload was inverted,
 * and a swap that misses costs one more round of requests we were on the point
 * of giving up on anyway.
 *
 * Skipped when it cannot say anything new: nothing to swap in, or two terms
 * that are already identical.
 */
function queryVariants(artist: string, title: string): [string, string][] {
  const natural: [string, string] = [artist, title];
  if (!artist.trim() || artist === title) return [natural];
  return [natural, [title, artist]];
}

/**
 * Tries each provider in order and stops at the first synced or plain result,
 * then tries them again with artist and title swapped.
 *
 * A provider being down, out of quota, or simply not having this track are
 * all reasons to move on to the next one rather than give up — that's the
 * whole point of having more than one. The swapped pass is the same idea
 * applied to the query instead of the source; see `queryVariants`.
 *
 * If every attempt comes back empty, "not-found" wins over "error": at
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

  for (const [queryArtist, queryTitle] of queryVariants(artist, title)) {
    for (const fetchFromProvider of providers) {
      if (signal?.aborted) return { status: "not-found" };

      const result = await fetchFromProvider(queryArtist, queryTitle, signal);
      if (result.status === "synced" || result.status === "plain") return result;
      if (result.status === "not-found") sawNotFound = true;
    }
  }

  return sawNotFound ? { status: "not-found" } : { status: "error" };
}
