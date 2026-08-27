import { parseLRC, type LyricLine } from "./parseLRC";

export const LRCLIB_BASE = "https://lrclib.net/api";

export type LyricsResult =
  | { status: "synced"; lines: LyricLine[] }
  | { status: "plain"; text: string }
  | { status: "not-found" }
  | { status: "error" };

interface LrclibRecord {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

/**
 * Looks up lyrics for a track.
 *
 * lrclib is a public, unauthenticated, community-run database: no key, which
 * is what lets this stay backend-free, but also no SLA. "No lyrics" is a normal
 * outcome here, not an exception: most of what people paste has none, and the
 * caller renders that as a state rather than an error.
 *
 * Synced lyrics win over plain whenever any result has them, even if a
 * plain-only record ranked higher: timing is the whole point of the display.
 */
export async function fetchLyrics(
  artist: string,
  title: string,
  signal?: AbortSignal,
): Promise<LyricsResult> {
  if (!title.trim()) return { status: "not-found" };

  const params = new URLSearchParams({ track_name: title, artist_name: artist });

  try {
    const response = await fetch(`${LRCLIB_BASE}/search?${params}`, { signal });
    if (!response.ok) return { status: "error" };

    const results: unknown = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      return { status: "not-found" };
    }

    const records = results as LrclibRecord[];
    const synced = records.find((record) => record.syncedLyrics?.trim());
    if (synced?.syncedLyrics) {
      const lines = parseLRC(synced.syncedLyrics);
      // A document that parses to nothing is unusable even though it existed.
      if (lines.length > 0) return { status: "synced", lines };
    }

    const plain = records.find((record) => record.plainLyrics?.trim());
    if (plain?.plainLyrics) return { status: "plain", text: plain.plainLyrics };

    return { status: "not-found" };
  } catch (error) {
    // An abort is the caller changing track, not a failure worth showing.
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "not-found" };
    }
    return { status: "error" };
  }
}
