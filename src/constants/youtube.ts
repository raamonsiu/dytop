export const YT_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

export const YT_OEMBED_ENDPOINT = "https://www.youtube.com/oembed";

/** Fallback thumbnail. Always exists for a valid id, so it covers an oEmbed
 * outage without a second request. */
export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
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
 */
export const SKIPPABLE_YT_ERROR_CODES = new Set([100, 101, 150]);

/** How long the error stays on screen before the queue advances. */
export const ERROR_SKIP_DELAY_MS = 1_500;
