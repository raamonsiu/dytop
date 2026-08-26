import { useEffect } from "react";

/** How far the interface may be scaled down and up. */
export const MIN_UI_SCALE = 0.75;
export const MAX_UI_SCALE = 1.6;

/** Multiplicative step per zoom gesture, roughly matching a browser's own. */
const STEP = 1.1;

/**
 * Next scale for a zoom gesture, clamped.
 *
 * Multiplicative so each step feels the same size in both directions — a fixed
 * additive step gets coarse when scaled down and sluggish when scaled up.
 * Pure and exported because browser zoom gestures can't be driven from a test.
 */
export function nextScale(current: number, direction: "in" | "out"): number {
  const raw = direction === "in" ? current * STEP : current / STEP;
  return Math.min(Math.max(raw, MIN_UI_SCALE), MAX_UI_SCALE);
}

function applyScale(scale: number): void {
  // The CSS `zoom` property rather than a transform: `transform` would make the
  // root a containing block for fixed-position descendants, which is most of
  // the chrome in both views. `zoom` also keeps layout and hit-testing correct.
  document.documentElement.style.zoom = scale === 1 ? "" : String(scale);
}

/**
 * Keeps zooming inside a usable range.
 *
 * The previous attempt tried to *detect* native browser zoom from
 * devicePixelRatio and counter-scale it. That never worked: the ratio is also
 * the display's own density, so there is no baseline to compare against, and
 * nothing could be verified without driving real browser zoom.
 *
 * This inverts the approach. The zoom gestures are intercepted before the
 * browser acts on them, and the app applies its own scale within fixed bounds —
 * so the limit is enforced rather than chased.
 *
 * What this cannot cover: zoom set from the browser's own menu, or OS-level
 * magnification. Neither is observable or interceptable from a page, by design.
 */
export function useZoomControl(): void {
  useEffect(() => {
    let scale = 1;

    const zoom = (direction: "in" | "out") => {
      const next = nextScale(scale, direction);
      if (next === scale) return;
      scale = next;
      applyScale(scale);
    };

    const handleWheel = (event: WheelEvent) => {
      // ctrl+wheel is the pinch/scroll zoom gesture on every platform; metaKey
      // covers the macOS variant.
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoom(event.deltaY < 0 ? "in" : "out");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      // "=" and "_" are the unshifted keys that carry "+" and "-".
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoom("in");
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoom("out");
      } else if (event.key === "0") {
        event.preventDefault();
        scale = 1;
        applyScale(scale);
      }
    };

    // passive: false is what makes preventDefault effective — wheel listeners
    // default to passive, and a passive listener cannot cancel the gesture.
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      document.documentElement.style.zoom = "";
    };
  }, []);
}
