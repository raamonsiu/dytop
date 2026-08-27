import { useEffect, useState } from "react";
import type { UiVisibility } from "@/constants/app";
import { createStore, useStore } from "./createStore";
import { setPref, usePref } from "./prefs";

/**
 * Movement below this many pixels is ignored.
 *
 * Any pointer motion reveals the chrome, so there has to be a floor: mice jitter
 * by a pixel at rest, and a trackpad resting under a palm emits a slow drip of
 * sub-pixel moves. Without it the chrome would never actually hide.
 */
const MOVEMENT_THRESHOLD_PX = 12;
/** How long the chrome stays after the pointer goes still. */
const HIDE_DELAY_MS = 2_000;
/** Touch has no hover, so a tap reveals for a fixed window. */
const TOUCH_REVEAL_MS = 2_600;

/**
 * Count of reasons the chrome must stay put, rather than a boolean, so several
 * components can hold it open at once without one clearing another's claim.
 */
const holdStore = createStore(0);

/**
 * Pins the chrome open for as long as `active` is true.
 *
 * Used by the paste field: auto-hide pulling the input out from under someone
 * mid-URL is the most annoying thing this view could do. The hold outlasts
 * focus and only lifts once the field is empty again, so tabbing away to copy
 * something doesn't lose what was typed.
 */
export function useChromeHold(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    holdStore.set((count) => count + 1);
    return () => holdStore.set((count) => count - 1);
  }, [active]);
}

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
  const holds = useStore(holdStore);
  const listening = state === "auto";

  useEffect(() => {
    if (!listening) return;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const clearHide = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = null;
    };

    const reveal = () => {
      clearHide();
      setRevealed(true);
    };

    const scheduleHide = (delay: number) => {
      clearHide();
      hideTimer = setTimeout(() => setRevealed(false), delay);
    };

    let lastX: number | null = null;
    let lastY: number | null = null;

    const handlePointerMove = (event: PointerEvent) => {
      // Any direction counts, not just a trip to the top edge: reaching for
      // the mouse at all is the signal that someone wants the controls.
      if (lastX !== null && lastY !== null) {
        const travelled = Math.hypot(event.clientX - lastX, event.clientY - lastY);
        if (travelled < MOVEMENT_THRESHOLD_PX) return;
      }
      lastX = event.clientX;
      lastY = event.clientY;

      reveal();
      // Restarted on every qualifying move, so the chrome stays up while the
      // pointer is in use and fades once it settles.
      scheduleHide(HIDE_DELAY_MS);
    };

    const handleTouchStart = () => {
      reveal();
      scheduleHide(TOUCH_REVEAL_MS);
    };

    // Leaving the window emits no further moves, which would otherwise leave
    // the chrome stuck open.
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
    // Holds only apply while auto-hiding. In the explicitly hidden states the
    // chrome is inert and nothing can be typed into anyway, and overriding
    // those would be contradicting a deliberate choice.
    chromeVisible: state === "pinned" || (listening && (revealed || holds > 0)),
    ringVisible: state !== "hidden",
    setState: (next) => setPref("uiVisibility", next),
  };
}
