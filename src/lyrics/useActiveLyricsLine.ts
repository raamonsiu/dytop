import { useEffect, useState } from "react";
import { subscribeToTime } from "@/player/clock";
import { findActiveLine } from "./findActiveLine";
import type { LyricLine } from "./parseLRC";

/**
 * Tracks which lyric line is current for a synced document, applying the
 * user's sync delay. Returns -1 until the first line is reached, or while
 * disabled. Shared by both views, which only differ in how they render it.
 */
export function useActiveLyricsLine(
  lines: LyricLine[] | null,
  delay: number,
  enabled = true,
): number {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    // No reset when disabled: the caller stops rendering the synced column in
    // that case, and subscribeToTime invokes its listener immediately, so a
    // new document recomputes the index in this same commit rather than
    // showing a stale highlight for a frame.
    if (!lines || !enabled) return;

    return subscribeToTime(({ current }) => {
      const next = findActiveLine(lines, current + delay);
      // The clock fires every frame but the line changes every few seconds, so
      // state is only touched on an actual transition.
      setActiveIndex((previous) => (previous === next ? previous : next));
    });
  }, [lines, delay, enabled]);

  return activeIndex;
}
