/**
 * How often the YouTube player is asked for its current time.
 *
 * The IFrame API has no timeupdate event, so polling is the only option. 300 ms
 * matches the prototype; the rAF clock interpolates between polls, so this rate
 * only governs drift correction, not the smoothness of the progress UI.
 */
export const PROGRESS_POLL_MS = 300;

/** onReady occasionally never fires (blocked third-party frames, file://).
 * After this long the engine assumes the player is usable anyway, as the
 * prototype did, rather than hanging with dead controls. */
export const PLAYER_READY_TIMEOUT_MS = 4_000;

/** Step for the lyrics sync nudge, in seconds. */
export const LYRICS_DELAY_STEP_SECONDS = 0.25;

/** Random background rotation interval. */
export const BACKGROUND_ROTATION_MS = 45_000;

/** Background crossfade duration; mirrored in the CSS transition. */
export const BACKGROUND_CROSSFADE_MS = 1_100;

/** Video backgrounds are resampled for the accent colour at this rate — often
 * enough to track a scene change, rare enough not to compete with playback. */
export const VIDEO_ACCENT_SAMPLE_MS = 400;

/** Refuse background uploads above this size. IndexedDB quota failures surface
 * asynchronously and are easy to swallow, so the limit is enforced up front. */
export const MAX_BACKGROUND_BYTES = 80 * 1024 * 1024;
