import {
  YT_INNERTUBE_CLIENT,
  YT_SEARCH_PROXY_PATH,
  YT_SEARCH_VIDEOS_ONLY,
} from "@/constants/youtube";

/** One row of search results: exactly what the list draws, nothing more. */
export interface SearchResult {
  videoId: string;
  title: string;
  /** Channel name. */
  author: string;
  /** As YouTube formats it, e.g. "5:22" or "1:02:03". */
  duration: string;
  /** Localised short view count, e.g. "618M views"; empty when missing. */
  views: string;
}

export interface SearchPage {
  results: SearchResult[];
  /** Opaque token for the next page, or null when there is none. */
  continuation: string | null;
}

const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Reads a path of object keys, giving up quietly at the first missing step. */
function dig(value: unknown, ...path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (!isObject(current)) return undefined;
    current = current[key];
  }
  return current;
}

/** InnerTube spells text either as `simpleText` or as a list of `runs`. */
function text(value: unknown): string {
  const simple = dig(value, "simpleText");
  if (typeof simple === "string") return simple.trim();
  return asArray(dig(value, "runs"))
    .map((run) => dig(run, "text"))
    .filter((part): part is string => typeof part === "string")
    .join("")
    .trim();
}

/**
 * Turns one `videoRenderer` into a row, or null when it isn't something the
 * queue can play as a track.
 *
 * Live streams and premieres carry no `lengthText`: they have no end, which
 * the queue can't advance past (the radio learned that the hard way), so no
 * duration means no row. Shorts are dropped by their reel endpoint in case
 * YouTube ever lets them through the video-only filter.
 */
function parseVideoRenderer(renderer: unknown): SearchResult | null {
  const videoId = dig(renderer, "videoId");
  if (typeof videoId !== "string" || !VIDEO_ID_PATTERN.test(videoId)) return null;
  if (dig(renderer, "navigationEndpoint", "reelWatchEndpoint") !== undefined) return null;

  const duration = text(dig(renderer, "lengthText"));
  const title = text(dig(renderer, "title"));
  if (!duration || !title) return null;

  return {
    videoId,
    title,
    author: text(dig(renderer, "ownerText")) || text(dig(renderer, "longBylineText")),
    duration,
    views: text(dig(renderer, "shortViewCountText")),
  };
}

/**
 * Extracts rows and the next-page token from an InnerTube search response.
 *
 * The first page and every continuation wrap the same sections differently,
 * so both roots are tried. Everything is read defensively: the format is
 * undocumented, and a shape change should cost results, never an exception
 * inside the UI.
 */
export function parseSearchResponse(data: unknown): SearchPage {
  const firstPage = dig(
    data,
    "contents",
    "twoColumnSearchResultsRenderer",
    "primaryContents",
    "sectionListRenderer",
    "contents",
  );
  const continuationPage = asArray(dig(data, "onResponseReceivedCommands")).flatMap((command) =>
    asArray(dig(command, "appendContinuationItemsAction", "continuationItems")),
  );
  const sections = [...asArray(firstPage), ...continuationPage];

  const results: SearchResult[] = [];
  let continuation: string | null = null;

  for (const section of sections) {
    for (const item of asArray(dig(section, "itemSectionRenderer", "contents"))) {
      const result = parseVideoRenderer(dig(item, "videoRenderer"));
      if (result) results.push(result);
    }

    const token = dig(
      section,
      "continuationItemRenderer",
      "continuationEndpoint",
      "continuationCommand",
      "token",
    );
    if (typeof token === "string" && token) continuation = token;
  }

  return { results, continuation };
}

async function post(body: Json, language: string, signal?: AbortSignal): Promise<SearchPage> {
  const response = await fetch(YT_SEARCH_PROXY_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // `hl` localises the view counts and durations to the UI's language.
      context: { client: { ...YT_INNERTUBE_CLIENT, hl: language } },
      ...body,
    }),
    signal,
  });
  if (!response.ok) throw new Error(`Search failed with HTTP ${response.status}`);
  return parseSearchResponse(await response.json());
}

/**
 * First page of video results for a text query.
 *
 * Unlike oEmbed this can fail outright (proxy missing, YouTube refusing), so it
 * rejects rather than falling back: the caller shows that search is
 * unavailable, and pasting a URL keeps working regardless.
 */
export function searchVideos(
  query: string,
  language: string,
  signal?: AbortSignal,
): Promise<SearchPage> {
  return post({ query, params: YT_SEARCH_VIDEOS_ONLY }, language, signal);
}

/** The page after the one that handed out `continuation`. */
export function searchVideosMore(
  continuation: string,
  language: string,
  signal?: AbortSignal,
): Promise<SearchPage> {
  return post({ continuation }, language, signal);
}
