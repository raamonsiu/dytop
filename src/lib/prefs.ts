import {
  DEFAULT_UI_VISIBILITY,
  normalizeUiVisibility,
  PREFS_STORAGE_KEY,
  type BackgroundMode,
  type UiVisibility,
} from "@/constants/app";
import type { ColorScheme, ViewName } from "@/themes/tokens";
import { createStore, useStoreSelector } from "./createStore";

export interface Prefs {
  /** Which view to restore on a cold start. */
  lastView: ViewName;
  colorScheme: ColorScheme;
  /** Seconds added to playback time before matching a lyric line. */
  lyricsDelay: number;
  lyricsVisible: boolean;
  backgroundMode: BackgroundMode;
  activeBackgroundId: string | null;
  uiVisibility: UiVisibility;
  /** HUD clock shows time remaining instead of elapsed. */
  showRemainingTime: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  lastView: "minimal",
  colorScheme: "dark",
  lyricsDelay: 0,
  lyricsVisible: true,
  backgroundMode: "fixed",
  activeBackgroundId: null,
  uiVisibility: DEFAULT_UI_VISIBILITY,
  showRemainingTime: false,
};

/**
 * Reads prefs, tolerating anything.
 *
 * Stored prefs are user-editable and survive across app versions, so a missing
 * key, a renamed enum value or outright garbage must degrade to the default
 * rather than crash the app on boot. Unknown keys are dropped by the spread.
 */
function readStoredPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFS;
    const merged = { ...DEFAULT_PREFS, ...(parsed as Partial<Prefs>) };
    // Enum values are the part most likely to be renamed between releases, and
    // an unrecognised one leaves the UI in a state no control can reach.
    merged.uiVisibility = normalizeUiVisibility(merged.uiVisibility);
    return merged;
  } catch {
    // Private-mode Safari throws on localStorage access, not just on write.
    return DEFAULT_PREFS;
  }
}

const prefsStore = createStore<Prefs>(readStoredPrefs());

export function getPrefs(): Prefs {
  return prefsStore.get();
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  const next = { ...prefsStore.get(), [key]: value };
  prefsStore.set(next);
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Out of quota or storage disabled — the in-memory value still applies for
    // this session, which is better than losing the interaction entirely.
  }
}

/** Subscribes to one preference. Returns a primitive, so it's a safe selector. */
export function usePref<K extends keyof Prefs>(key: K): Prefs[K] {
  return useStoreSelector(prefsStore, (prefs) => prefs[key]);
}
