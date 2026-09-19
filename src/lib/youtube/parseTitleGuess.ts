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

/** YouTube names its auto-generated artist channels "<Artist> - Topic", with
 * whichever dash the channel happens to use. The suffix is boilerplate no
 * lyrics provider indexes. */
const TOPIC_SUFFIX = /\s[-–—]\sTopic$/;

const RUN_OF_SPACES = /\s{2,}/g;

/** Stripping noise leaves the gaps behind, and a provider matching on the raw
 * string counts those double spaces against the query. */
function collapse(value: string): string {
  return value.replace(RUN_OF_SPACES, " ").trim();
}

/** The channel name, usable as an artist. */
export function artistFromChannel(author: string): string {
  return author.replace(TOPIC_SUFFIX, "").trim();
}

/** A channel and a title rarely agree on capitalisation, and that is the only
 * difference worth forgiving here — a looser match would start swapping halves
 * that merely mention the channel. */
function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Guesses artist and title from a YouTube video title, for the lyrics lookup.
 *
 * Deliberately a heuristic, as in the prototype: uploads follow no schema, and
 * a wrong guess costs a missed lyric, not a broken player. On "A - B - C" the
 * first separator wins and the rest stays in the title, since featured-artist
 * suffixes are far more common than a two-part artist name.
 *
 * `author` is the uploading channel, and it settles two things the title alone
 * cannot. It stands in as the artist when there is no separator to split, so a
 * video titled with nothing but the song still asks a complete question. And
 * it fixes the orientation when there is one: lyric-video channels write
 * "Song - Artist" as consistently as everyone else writes "Artist - Song", so
 * a right-hand side that *is* the channel means the halves are round the wrong
 * way. Titles the channel cannot settle keep their natural reading and are
 * sorted out a step later, by the lookup's swapped retry (see `queryVariants`).
 */
export function parseTitleGuess(rawTitle: string, author = ""): TitleGuess {
  const cleaned = collapse(rawTitle.replace(NOISE_PATTERN, ""));
  const channel = artistFromChannel(author);
  const parts = cleaned.split(SEPARATOR_PATTERN);

  if (parts.length >= 2) {
    const left = parts[0] ?? "";
    // The trailer is dropped only on this branch. With an artist already
    // separated out, what follows the bar is decoration; on a title with no
    // separator the bar may well *be* the separator ("Don Omar | Zumba"), so
    // it is left alone rather than guessed at and truncated to the artist.
    const right = parts.slice(1).join(" - ").replace(TRAILER_PATTERN, "");

    // Only the right-hand match flips it: when both sides could be the channel
    // the natural reading already agrees, and when neither is, there is nothing
    // to go on.
    const inverted = channel !== "" && sameName(right, channel) && !sameName(left, channel);
    return inverted ? { artist: right, title: left } : { artist: left, title: right };
  }

  return { artist: channel, title: cleaned || rawTitle };
}
