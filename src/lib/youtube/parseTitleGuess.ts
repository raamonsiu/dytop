export interface TitleGuess {
  artist: string;
  title: string;
}

/** Only bracketed groups that look like upload noise are stripped: a bare
 * `(Live)` or `(feat. X)` is part of the title and must survive, because it
 * changes which recording the lyrics provider matches. */
const NOISE_PATTERN =
  /[([][^()[\]]*?(official|video|audio|lyrics?|visualizer|mv|hd|4k)[^()[\]]*?[)\]]/gi;

/** Hyphen, en dash and em dash, each surrounded by spaces. Unspaced hyphens are
 * left alone: they show up inside real titles far more often than as a
 * separator. */
const SEPARATOR_PATTERN = /\s[-–—]\s/;

/**
 * Guesses artist and title from a YouTube video title, for the lyrics lookup.
 *
 * Deliberately a heuristic, as in the prototype: uploads follow no schema, and
 * a wrong guess costs a missed lyric, not a broken player. On "A - B - C" the
 * first separator wins and the rest stays in the title, since featured-artist
 * suffixes are far more common than a two-part artist name.
 */
export function parseTitleGuess(rawTitle: string): TitleGuess {
  const cleaned = rawTitle.replace(NOISE_PATTERN, "").trim();
  const parts = cleaned.split(SEPARATOR_PATTERN);

  if (parts.length >= 2) {
    return {
      artist: (parts[0] ?? "").trim(),
      title: parts.slice(1).join(" - ").trim(),
    };
  }

  return { artist: "", title: cleaned };
}
