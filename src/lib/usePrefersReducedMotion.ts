import { useMediaQuery } from "./useMediaQuery";

/** Live, not read-once: the setting can change mid-session, and a backdrop that
 * keeps animating after the user asks it to stop is the whole problem. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
