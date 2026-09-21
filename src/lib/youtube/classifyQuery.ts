export type QueryKind = "empty" | "url" | "search";

/** An explicit scheme, or a bare YouTube host someone pasted without one. */
const URL_LIKE_PATTERN =
  /^(https?:\/\/|(www\.|m\.|music\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)(\/|$))/i;

/**
 * Decides whether the add-song field holds a link or words to search for.
 *
 * Deliberately about intent, not validity: a pasted link that turns out to be
 * malformed is still a link, and should get the "not a valid YouTube URL"
 * error rather than being quietly searched for as text. Everything that
 * doesn't look like a link is a search.
 */
export function classifyQuery(value: string): QueryKind {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  return URL_LIKE_PATTERN.test(trimmed) ? "url" : "search";
}
