import { useEffect, type RefObject } from "react";
import { VIDEO_ACCENT_SAMPLE_MS } from "@/constants/player";
import { toCssRgb } from "./accent";
import { sampleAccent } from "./sampleMedia";

/**
 * Drives `--accent-override` on a view's root element from the active
 * background.
 *
 * Written to the shell node, never `:root`. globals.css derives `--accent` from
 * `--accent-override` on `[data-view]`, so scoping it here is what keeps the
 * legacy accent out of the minimal view when navigating between them without a
 * reload.
 *
 * Set imperatively rather than through state because video backgrounds are
 * resampled several times a second, and each sample would otherwise re-render
 * the whole shell.
 */
export function useDynamicAccent(
  shellRef: RefObject<HTMLElement | null>,
  mediaRef: RefObject<HTMLImageElement | HTMLVideoElement | null>,
  /** Changes whenever the active background does, restarting the sampling. */
  backgroundKey: string | null,
): void {
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    if (!backgroundKey) {
      shell.style.removeProperty("--accent-override");
      return;
    }

    let cancelled = false;

    const apply = () => {
      const media = mediaRef.current;
      if (cancelled || !media) return;
      const accent = sampleAccent(media);
      // A failed sample keeps the previous accent rather than snapping to a
      // fallback — a single undecoded video frame shouldn't flash the UI.
      if (accent) shell.style.setProperty("--accent-override", toCssRgb(accent));
    };

    // Media may not be decoded yet on the first pass; the interval covers it.
    apply();
    const interval = setInterval(apply, VIDEO_ACCENT_SAMPLE_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [shellRef, mediaRef, backgroundKey]);
}
