import type { LyricLine } from "./parseLRC";

/**
 * Index of the line that should be highlighted at `time`, or -1 before the
 * first one starts.
 *
 * Binary search rather than a scan: this runs on every animation frame, and
 * lyric documents routinely carry a few hundred lines.
 *
 * The active line is the last one whose timestamp has passed — lines have a
 * start but no end, so a line stays current until the next begins.
 */
export function findActiveLine(lines: LyricLine[], time: number): number {
  let low = 0;
  let high = lines.length - 1;
  let found = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const line = lines[mid];
    if (!line) break;

    if (line.time <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return found;
}
