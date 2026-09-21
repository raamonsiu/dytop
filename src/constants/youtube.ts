export const YT_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

export const YT_OEMBED_ENDPOINT = "https://www.youtube.com/oembed";

/**
 * Same-origin path that nginx (and the Vite dev server) proxies to YouTube's
 * internal InnerTube search endpoint. There is no keyless public search API,
 * and InnerTube sends no CORS headers, so the browser can't call it directly;
 * going through our own origin also keeps the CSP's `connect-src 'self'`.
 */
export const YT_SEARCH_PROXY_PATH = "/api/youtube/search";

/**
 * The client InnerTube is told it's talking to. Undocumented, so the version is
 * pinned to one known to answer; YouTube tolerates old versions of the WEB
 * client for a long time, but this is the first thing to bump if search starts
 * returning 400s.
 */
export const YT_INNERTUBE_CLIENT = {
  clientName: "WEB",
  clientVersion: "2.20250101.00.00",
} as const;

/** Search filter "Type: Video", as serialized by YouTube's own filter menu.
 * Keeps channels, playlists and shorts shelves out of the results. */
export const YT_SEARCH_VIDEOS_ONLY = "EgIQAQ==";

/** Fallback thumbnail. Always exists for a valid id, so it covers an oEmbed
 * outage without a second request. */
export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** 320x180 thumbnail, for list rows where hqdefault would be wasted bytes. */
export function smallThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Player parameters. The app draws all of its own chrome, so the embed is
 * effectively an audio element: no controls, no keyboard handling of its own
 * (the app owns the shortcuts), and inline on iOS so it doesn't jump to
 * fullscreen.
 */
export const YT_PLAYER_VARS = {
  autoplay: 0,
  controls: 0,
  disablekb: 1,
  modestbranding: 1,
  playsinline: 1,
} as const;

/** Maps YouTube's onError codes to i18n keys under `errors.player`. */
export const YT_ERROR_KEYS: Record<number, string> = {
  2: "invalidId",
  5: "html5",
  100: "notFound",
  101: "embedDisabled",
  150: "embedDisabled",
  153: "originRejected",
};

/**
 * Errors that are specific to one video, so the queue should move on.
 *
 * 153 (origin rejected) and 5 (player fault) are deliberately excluded: they
 * fail identically for every video, so auto-skipping would silently burn
 * through the whole queue. The prototype made the same distinction.
 *
 * 2 belongs with the per-video ones: the API raises it for an invalid
 * parameter, and the only parameter that varies here is the video id — the
 * player vars are a frozen constant, so a malformed one would break the very
 * first load rather than a single entry. An id that survived
 * `extractYouTubeId` but that YouTube rejects used to stall the queue on that
 * entry for good, with no control able to move past it.
 */
export const SKIPPABLE_YT_ERROR_CODES = new Set([2, 100, 101, 150]);

/** How long the error stays on screen before the queue advances. */
export const ERROR_SKIP_DELAY_MS = 1_500;
