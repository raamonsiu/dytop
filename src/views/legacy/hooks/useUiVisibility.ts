import { UI_VISIBILITY_STATES, type UiVisibility } from "@/constants/app";
import { setPref, usePref } from "@/lib/prefs";

interface UiVisibilityApi {
  state: UiVisibility;
  /** Chrome (navbar and HUD) is on screen. */
  chromeVisible: boolean;
  /** The progress ring is on screen. */
  ringVisible: boolean;
  cycle: () => void;
}

/**
 * The prototype's three-state hide control, kept verbatim: everything visible,
 * everything hidden, or chrome hidden with the ring left on.
 *
 * That middle-ground state is the point of the feature — it turns the window
 * into an ambient display that still shows how far into the track you are.
 */
export function useUiVisibility(): UiVisibilityApi {
  const state = usePref("uiVisibility");

  return {
    state,
    chromeVisible: state === "visible",
    ringVisible: state !== "hidden-all",
    cycle: () => {
      const index = UI_VISIBILITY_STATES.indexOf(state);
      const next = UI_VISIBILITY_STATES[(index + 1) % UI_VISIBILITY_STATES.length];
      if (next) setPref("uiVisibility", next);
    },
  };
}
