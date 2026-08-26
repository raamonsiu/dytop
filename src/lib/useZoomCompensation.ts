import { useEffect } from "react";

/**
 * Never compensate past this. Beyond it the UI would be scaled up so far that a
 * deliberate zoom-out stops doing anything at all, which is its own kind of
 * broken.
 */
const MAX_COMPENSATION = 1.8;

/** Below this much zoom-out, start pushing back. Small steps (90%, 80%) are
 * usually intentional and left alone. */
const COMPENSATION_THRESHOLD = 0.8;

/**
 * The device pixel ratio at first paint, taken as "unzoomed".
 *
 * Browser zoom is not directly observable, but it scales devicePixelRatio, so
 * the ratio against a known starting point gives the zoom level. Captured at
 * module load, which means the one case this cannot detect is a page loaded
 * *already* zoomed out — there is no baseline to compare against, and the
 * platform exposes nothing that separates zoom from display density.
 */
const referenceDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;

/**
 * How much to scale the UI up, given the current and baseline pixel ratios.
 *
 * Pure and exported so the policy is testable — browser zoom can't be driven
 * from a test or a headless browser.
 */
export function compensationFor(dpr: number, reference = referenceDpr): number {
  if (!Number.isFinite(dpr) || dpr <= 0 || !Number.isFinite(reference) || reference <= 0) {
    return 1;
  }

  const zoom = dpr / reference;
  // Zooming *in* is left alone: asking for a bigger UI and getting one is
  // correct behaviour.
  if (zoom >= COMPENSATION_THRESHOLD) return 1;
  return Math.min(1 / zoom, MAX_COMPENSATION);
}

/**
 * Keeps the interface legible when the browser is zoomed out.
 *
 * At 50% zoom every fixed size halves, and this UI — built on 10-12px labels —
 * stops being readable well before the layout itself breaks. The root is
 * counter-scaled to hold its apparent size.
 *
 * Uses the CSS `zoom` property rather than a transform: `transform` would make
 * the root a containing block for fixed-position descendants, which is most of
 * the chrome in both views.
 */
export function useZoomCompensation(): void {
  useEffect(() => {
    const apply = () => {
      const scale = compensationFor(window.devicePixelRatio);
      document.documentElement.style.zoom = scale === 1 ? "" : String(scale);
    };

    // Zoom changes fire resize, and also flip any resolution media query. The
    // query has to be re-registered after each change because it is pinned to
    // the previous ratio.
    let query: MediaQueryList | null = null;
    const listen = () => {
      query?.removeEventListener("change", onChange);
      query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      query.addEventListener("change", onChange);
    };
    const onChange = () => {
      apply();
      listen();
    };

    apply();
    listen();
    window.addEventListener("resize", apply);

    return () => {
      query?.removeEventListener("change", onChange);
      window.removeEventListener("resize", apply);
      document.documentElement.style.zoom = "";
    };
  }, []);
}
