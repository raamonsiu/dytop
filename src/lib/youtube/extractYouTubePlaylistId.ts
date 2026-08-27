import { isHostOrSubdomain } from "./youtubeHost";

/** Loose on purpose: playlist ids vary in length and prefix (`PL`, `RD`, `OLAK5uy_`…). */
const PLAYLIST_ID_PATTERN = /^[\w-]{2,64}$/;

/**
 * Pulls a playlist id out of a playlist page URL, e.g.
 * `youtube.com/playlist?list=PLxxxx`.
 *
 * A `watch?v=...&list=...` URL is deliberately not treated as a playlist:
 * that shape is what you get from clicking a video *inside* a playlist, and
 * pasting it should add just that one track, not silently import dozens more.
 * Importing the whole list requires pasting the playlist's own URL.
 */
export function extractYouTubePlaylistId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const { hostname, pathname, searchParams } = parsed;
  if (!isHostOrSubdomain(hostname, "youtube.com") && !isHostOrSubdomain(hostname, "youtube-nocookie.com")) {
    return null;
  }
  if (pathname !== "/playlist") return null;

  const candidate = searchParams.get("list");
  return candidate && PLAYLIST_ID_PATTERN.test(candidate) ? candidate : null;
}
