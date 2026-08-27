import { thumbnailUrl, watchUrl, YT_OEMBED_ENDPOINT } from "@/constants/youtube";
import type { Track } from "@/player/types";
import { parseTitleGuess } from "./parseTitleGuess";

interface OEmbedResponse {
  title?: unknown;
  author_name?: unknown;
  thumbnail_url?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Fetches title, channel and thumbnail for a video.
 *
 * oEmbed is public and unauthenticated, which is the whole reason this app
 * needs no backend and no API key: the Data API would require both, plus a
 * quota. The trade-off is that it returns nothing else: no duration, no
 * artist/title split. Duration comes from the player once loaded, and the split
 * is guessed from the title.
 *
 * A failure is not exceptional: the video may be private, or the network may
 * be down, so this always resolves to a usable Track, falling back to the
 * thumbnail URL that any valid id serves.
 */
export async function fetchTrack(
  videoId: string,
  entryId: string,
  signal?: AbortSignal,
): Promise<Track> {
  const fallback: Track = {
    id: entryId,
    videoId,
    title: videoId,
    author: "",
    thumb: thumbnailUrl(videoId),
    artistGuess: "",
    titleGuess: videoId,
  };

  try {
    const url = `${YT_OEMBED_ENDPOINT}?url=${encodeURIComponent(watchUrl(videoId))}&format=json`;
    const response = await fetch(url, { signal });
    if (!response.ok) return fallback;

    const data = (await response.json()) as OEmbedResponse;
    const title = asString(data.title);
    if (!title) return fallback;

    const guess = parseTitleGuess(title);
    return {
      id: entryId,
      videoId,
      title,
      author: asString(data.author_name) ?? "",
      thumb: asString(data.thumbnail_url) ?? thumbnailUrl(videoId),
      artistGuess: guess.artist,
      titleGuess: guess.title,
    };
  } catch {
    return fallback;
  }
}
