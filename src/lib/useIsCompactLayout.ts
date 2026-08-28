import { useMediaQuery } from "./useMediaQuery";

/**
 * Below this the chrome stops being a set of floating corner widgets and
 * becomes a stack of full-width rows. Matches Tailwind's `sm`, so the utility
 * classes elsewhere flip at the same point this does.
 */
export const COMPACT_LAYOUT_MAX_WIDTH = 639;

/**
 * True on phone-width viewports.
 *
 * Width rather than `pointer: coarse`: what breaks on a phone is the amount of
 * room the corner widgets have, and a narrow desktop window has the same
 * problem. Live, so rotating the device rearranges the chrome immediately.
 */
export function useIsCompactLayout(): boolean {
  return useMediaQuery(`(max-width: ${COMPACT_LAYOUT_MAX_WIDTH}px)`);
}
