import { useEffect, useState } from "react";
import type { UiVisibility } from "@/constants/app";
import { setPref, usePref } from "./prefs";

/** Pointer within this many pixels of the top edge reveals the chrome. */
const TRIGGER_ZONE_PX = 90;
/** Kept on screen this long after the pointer leaves the zone, so crossing a
 * gap between controls doesn't dismiss it mid-reach. */
const HIDE_DELAY_MS = 900;
/** Touch has no hover, so a tap near the top reveals for a fixed window. */
const TOUCH_REVEAL_MS = 2_600;

export interface UiVisibilityApi {
  state: UiVisibility;
  /** Navbar, HUD and any other chrome should be on screen. */
  chromeVisible: boolean;
  /** The progress ring should be on screen. */
  ringVisible: boolean;
  setState: (next: UiVisibility) => void;
}

/**
 * Owns how much of the interface is showing, shared by both views.
 *
 * The reveal-on-approach listeners only run in `auto`; `pinned` keeps the
 * chrome up unconditionally, which is the whole point of that state.
 */
export function useUiVisibility(): UiVisibilityApi {
  const state = usePref("uiVisibility");
  const [revealed, setRevealed] = useState(false);
  const listening = state === "auto";

  useEffect(() => {
    if (!listening) return;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    /** Tracked in the effect's own closure rather than read back from state:
     * depending on the state value would re-attach every listener on each
     * reveal, and mirroring it into a ref means reading a ref during render. */
    let isRevealed = false;

    const clearHide = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = null;
    };

    const reveal = () => {
      clearHide();
      isRevealed = true;
      setRevealed(true);
    };

    const scheduleHide = (delay: number) => {
      clearHide();
      hideTimer = setTimeout(() => {
        isRevealed = false;
        setRevealed(false);
      }, delay);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.clientY <= TRIGGER_ZONE_PX) reveal();
      else if (isRevealed) scheduleHide(HIDE_DELAY_MS);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? Number.POSITIVE_INFINITY;
      if (y <= TRIGGER_ZONE_PX) {
        reveal();
        scheduleHide(TOUCH_REVEAL_MS);
      }
    };

    // The pointer leaving the window never produces a move event below the
    // zone, which would otherwise leave the chrome stuck open.
    const handlePointerLeave = () => scheduleHide(HIDE_DELAY_MS);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      clearHide();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [listening]);

  return {
    state,
    chromeVisible: state === "pinned" || (listening && revealed),
    ringVisible: state !== "hidden",
    setState: (next) => setPref("uiVisibility", next),
  };
}
