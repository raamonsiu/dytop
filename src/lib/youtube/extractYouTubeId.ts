/** YouTube video ids are always 11 chars of the URL-safe base64 alphabet. */
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

/** True for `base` itself or any of its subdomains, never a lookalike like `evil-youtube.com`. */
function isHostOrSubdomain(hostname: string, base: string): boolean {
  return hostname === base || hostname.endsWith(`.${base}`);
}

/**
 * Pulls the video id out of any of the four URL shapes YouTube hands out:
 * `watch?v=`, `youtu.be/`, `/shorts/` and `/embed/`.
 *
 * Returns null for anything else, including a well-formed URL whose id is the
 * wrong shape. The prototype passed those straight through to the player, which
 * answered with a code-2 error a second later; rejecting up front lets the
 * paste box say so immediately.
 */
export function extractYouTubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const { hostname, pathname, searchParams } = parsed;
  let candidate: string | null = null;

  if (isHostOrSubdomain(hostname, "youtu.be")) {
    candidate = pathname.slice(1).split("/")[0] ?? null;
  } else if (isHostOrSubdomain(hostname, "youtube.com") || isHostOrSubdomain(hostname, "youtube-nocookie.com")) {
    if (pathname === "/watch") {
      candidate = searchParams.get("v");
    } else if (pathname.startsWith("/shorts/") || pathname.startsWith("/embed/")) {
      candidate = pathname.split("/")[2] ?? null;
    }
  }

  return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}
