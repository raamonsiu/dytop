import { useEffect, useRef } from "react";
import { initPlayer } from "./controller";

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
export function PlayerHost() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // YT.Player *replaces* the element it's given with the iframe rather than
    // appending to it. Handing it a React-rendered node would leave React's
    // fiber pointing at a node no longer in the document, and the next
    // reconciliation touching it throws NotFoundError on removeChild. So the
    // target is created imperatively: React owns the wrapper and never knows
    // this child exists.
    const target = document.createElement("div");
    host.appendChild(target);

    // No cleanup on purpose. The player outlives every view, and tearing it
    // down on StrictMode's simulated unmount would leave the second mount
    // holding a dead embed. initPlayer() is idempotent, so the second call is
    // a no-op and the orphan div is simply never used.
    void initPlayer(target);
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none fixed -left-[9999px] -top-[9999px] size-px opacity-0"
    />
  );
}
