import type { LyricLine } from "./parseLRC";

export type LyricsResult =
  | { status: "synced"; lines: LyricLine[] }
  | { status: "plain"; text: string }
  | { status: "not-found" }
  | { status: "error" };

/** A source `fetchLyrics` can query. Shape shared by every provider client. */
export type LyricsProviderFetch = (
  artist: string,
  title: string,
  signal?: AbortSignal,
) => Promise<LyricsResult>;
