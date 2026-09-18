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

/** Everything from the first spaced bar on. Uploads park the album, the
 * playlist or a repeat of the channel name there, never the song itself. */
const TRAILER_PATTERN = /\s\|\s.*$/;

/** YouTube names its auto-generated artist channels "<Artist> - Topic". The
 * suffix is boilerplate no lyrics provider indexes. */
const TOPIC_SUFFIX = /\s-\sTopic$/;

/** Stripping noise leaves the gaps behind, and a provider matching on the raw
 * string counts those double spaces against the query. */
function collapse(value: string): string {
  return value.replace(/\s{2,}/g, " ").trim();
}

/**
 * The channel name, usable as an artist.
 *
 * Both lookup paths fall back to it when the title carries no separator to
 * split, so a video titled with nothing but the song still asks a complete
 * question instead of one with an empty artist.
 */
export function artistFromChannel(author: string): string {
  return author.replace(TOPIC_SUFFIX, "").trim();
}

/**
 * Guesses artist and title from a YouTube video title, for the lyrics lookup.
 *
 * Deliberately a heuristic, as in the prototype: uploads follow no schema, and
 * a wrong guess costs a missed lyric, not a broken player. On "A - B - C" the
 * first separator wins and the rest stays in the title, since featured-artist
 * suffixes are far more common than a two-part artist name.
 */
export function parseTitleGuess(rawTitle: string): TitleGuess {
  const cleaned = collapse(rawTitle.replace(NOISE_PATTERN, ""));
  const parts = cleaned.split(SEPARATOR_PATTERN);

  if (parts.length >= 2) {
    return {
      artist: (parts[0] ?? "").trim(),
      // The trailer is dropped only on this branch. With an artist already
      // separated out, what follows the bar is decoration; on a title with no
      // separator the bar may well *be* the separator ("Don Omar | Zumba"), so
      // it is left alone rather than guessed at and truncated to the artist.
      title: collapse(parts.slice(1).join(" - ").replace(TRAILER_PATTERN, "")),
    };
  }

  return { artist: "", title: cleaned };
}
