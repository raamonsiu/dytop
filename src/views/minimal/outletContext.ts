import { useOutletContext } from "react-router-dom";

export interface MinimalOutletContext {
  /** False while the visibility control has the chrome hidden. */
  chromeVisible: boolean;
}

/**
 * Passed down from MinimalShell rather than each route calling useUiVisibility
 * itself: that hook attaches the reveal-on-approach listeners, and a second
 * instance would attach a duplicate set.
 */
export function useMinimalOutletContext(): MinimalOutletContext {
  return useOutletContext<MinimalOutletContext>();
}
