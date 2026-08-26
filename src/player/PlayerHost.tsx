/**
 * The one place the YouTube iframe is allowed to live.
 *
 * Mounted by RootLayout *outside* the router Outlet, so switching between the
 * minimal and legacy views never unmounts it. Reparenting an iframe in the DOM
 * reloads it, which would restart the video, so this element must not move.
 *
 * The player is audio-only here: the visuals are the app's own. Rather than
 * `display: none` — which some browsers treat as reason to throttle or refuse
 * playback — it's pushed offscreen at 1x1, as the prototype did.
 */
export const PLAYER_MOUNT_ID = "yt-mount";

export function PlayerHost() {
  return (
    <div
      id={PLAYER_MOUNT_ID}
      aria-hidden
      className="pointer-events-none fixed -left-[9999px] -top-[9999px] size-px opacity-0"
    />
  );
}
