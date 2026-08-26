import { useEffect } from "react";
import { BACKGROUND_ROTATION_MS } from "@/constants/player";
import { usePref } from "@/lib/prefs";
import { useNowPlaying } from "@/player/queueStore";
import { pickRandomBackground } from "./backgroundsStore";

/**
 * Advances the background according to the chosen mode.
 *
 * The three modes come straight from the prototype: hold one image, rotate on a
 * timer, or change with the track. `fixed` deliberately does nothing.
 */
export function useBackgroundRotation(): void {
  const mode = usePref("backgroundMode");
  const nowPlaying = useNowPlaying();
  const trackId = nowPlaying?.id ?? null;

  useEffect(() => {
    if (mode !== "random") return;
    const interval = setInterval(pickRandomBackground, BACKGROUND_ROTATION_MS);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    // Keyed on the track id, so this fires once per song change rather than on
    // every queue mutation.
    if (mode !== "on-song-change" || !trackId) return;
    pickRandomBackground();
  }, [mode, trackId]);
}
