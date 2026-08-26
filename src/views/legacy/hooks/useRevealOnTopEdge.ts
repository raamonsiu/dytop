import { useEffect, useState } from "react";

/** Pointer within this many pixels of the top edge reveals the navbar. */
const TRIGGER_ZONE_PX = 90;
/** Kept on screen this long after the pointer leaves the zone, so crossing a
 * gap between controls doesn't dismiss it mid-reach. */
const HIDE_DELAY_MS = 900;
/** Touch has no hover, so a tap near the top reveals for a fixed window. */
const TOUCH_REVEAL_MS = 2_600;

/**
 * Reveals chrome when the pointer approaches the top of the window.
 *
 * The legacy view is meant to be looked at, not operated, so the navbar stays
 * out of the way until reached for. `enabled` is false while the hide-UI toggle
 * has chrome switched off — otherwise the navbar would still slide in and
 * defeat the toggle.
 */
export function useRevealOnTopEdge(enabled: boolean): boolean {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // No listeners while disabled. The hook's return value is already gated on
    // `enabled`, so there's no state to reset here.
    if (!enabled) return;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    /** Tracked in the effect's own closure rather than read back from state:
     * every transition goes through the two helpers below, and depending on
     * the state value would re-attach all listeners on each reveal. */
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
      if (event.clientY <= TRIGGER_ZONE_PX) {
        reveal();
      } else if (isRevealed) {
        scheduleHide(HIDE_DELAY_MS);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? Number.POSITIVE_INFINITY;
      if (y <= TRIGGER_ZONE_PX) {
        reveal();
        scheduleHide(TOUCH_REVEAL_MS);
      }
    };

    // The pointer leaving the window never produces a move event below the
    // zone, which would otherwise leave the navbar stuck open.
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
  }, [enabled]);

  return enabled && revealed;
}
