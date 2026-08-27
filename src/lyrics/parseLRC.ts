export interface LyricLine {
  /** Seconds from the start of the track. */
  time: number;
  text: string;
}

/**
 * `[mm:ss.xx]` or `[mm:ss.xxx]`, possibly several on one line.
 *
 * Looser than the prototype's fixed two-digit fields, because lyric files are
 * community-authored and inconsistent: minutes come both zero-padded and bare
 * (and tracks past 99 minutes exist), and the fraction shows up with one, two
 * or three digits. It's read as a decimal fraction of a second, so ".5" is half
 * a second rather than five milliseconds.
 */
const TIMESTAMP_PATTERN = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/**
 * Parses an LRC document into timed lines, sorted by time.
 *
 * A line may carry several timestamps when the same words repeat: a chorus is
 * stored once and pointed at from every occurrence, so each timestamp becomes
 * its own entry.
 *
 * Instrumental gaps arrive as a timestamp with no text. Those are kept, not
 * dropped: they're what makes the display fall quiet between verses instead of
 * leaving the previous line highlighted over an instrumental.
 */
export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const rawLine of lrc.split("\n")) {
    const matches = [...rawLine.matchAll(TIMESTAMP_PATTERN)];
    if (matches.length === 0) continue;

    const text = rawLine.replace(TIMESTAMP_PATTERN, "").trim();

    for (const match of matches) {
      const minutes = Number.parseInt(match[1] ?? "0", 10);
      const seconds = Number.parseInt(match[2] ?? "0", 10);
      // ".5" would otherwise read as 5ms rather than 500ms.
      const fraction = Number.parseInt((match[3] ?? "0").padEnd(3, "0"), 10);
      lines.push({ time: minutes * 60 + seconds + fraction / 1000, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}
