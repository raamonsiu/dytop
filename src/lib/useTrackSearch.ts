import i18n from "i18next";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/createStore";
import { searchVideos, searchVideosMore } from "@/lib/youtube/search";
import { createTrackSearch, type TrackSearchState } from "@/lib/youtube/trackSearch";

/**
 * Search-as-you-type bound to a component's lifetime: pass the current field
 * value (or "" to switch searching off) and render the returned state.
 * See `createTrackSearch` for the debounce and stale-response rules.
 *
 * The language is read when each request goes out rather than when the
 * session is made, so switching the UI language localises the next search.
 */
export function useTrackSearch(query: string): TrackSearchState & { loadMore: () => void } {
  const [session] = useState(() =>
    createTrackSearch({
      search: (value, signal) => searchVideos(value, i18n.language, signal),
      searchMore: (token, signal) => searchVideosMore(token, i18n.language, signal),
    }),
  );

  useEffect(() => {
    session.setQuery(query);
  }, [session, query]);

  useEffect(() => session.dispose, [session]);

  return { ...useStore(session.store), loadMore: session.loadMore };
}
