import type { LyricsResult } from "./types";

export const LYRICS_OVH_BASE = "https://api.lyrics.ovh/v1";

interface LyricsOvhRecord {
  lyrics?: string;
}

/**
 * Looks up lyrics for a track on lyrics.ovh.
 *
 * Also free and unauthenticated, so it keeps the app backend-free like lrclib.
 * It only ever returns plain text — there's no timing data, so a track that
 * lands here never gets the synced ("karaoke") display, only the static one.
 *
 * Used as a fallback: lrclib covers most tracks and is tried first.
 */
export async function fetchLyrics(
  artist: string,
  title: string,
  signal?: AbortSignal,
): Promise<LyricsResult> {
  if (!title.trim()) return { status: "not-found" };

  const path = `${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

  try {
    const response = await fetch(`${LYRICS_OVH_BASE}/${path}`, { signal });
    // A miss comes back as 404, not an empty body, so it's not an "error".
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "error" };

    const record: LyricsOvhRecord = await response.json();
    if (!record.lyrics?.trim()) return { status: "not-found" };

    return { status: "plain", text: record.lyrics.trim() };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "not-found" };
    }
    return { status: "error" };
  }
}
