import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchPage, SearchResult } from "./search";
import { createTrackSearch, IDLE_SEARCH } from "./trackSearch";

const DEBOUNCE = 100;

function result(videoId: string): SearchResult {
  return { videoId, title: videoId, author: "a", duration: "1:00", views: "" };
}

function page(ids: string[], continuation: string | null = null): SearchPage {
  return { results: ids.map(result), continuation };
}

/** A promise the test resolves or rejects by hand, to control ordering. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup() {
  const search = vi.fn<(query: string, signal: AbortSignal) => Promise<SearchPage>>();
  const searchMore = vi.fn<(token: string, signal: AbortSignal) => Promise<SearchPage>>();
  const session = createTrackSearch({ search, searchMore, debounceMs: DEBOUNCE, minChars: 2 });
  return { search, searchMore, session, state: () => session.store.get() };
}

describe("createTrackSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for typing to pause before searching", async () => {
    const { search, session, state } = setup();
    search.mockResolvedValue(page(["aaaaaaaaaaa"], "T1"));

    session.setQuery("da");
    session.setQuery("daf");
    session.setQuery("daft");
    expect(state().status).toBe("loading");
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DEBOUNCE);

    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe("daft");
    expect(state()).toMatchObject({
      query: "daft",
      status: "ready",
      results: [result("aaaaaaaaaaa")],
      continuation: "T1",
    });
  });

  it("stays idle below the minimum length", async () => {
    const { search, session, state } = setup();
    session.setQuery(" d ");
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(search).not.toHaveBeenCalled();
    expect(state()).toEqual(IDLE_SEARCH);
  });

  it("ignores whitespace-only changes to the same query", async () => {
    const { search, session } = setup();
    search.mockResolvedValue(page(["aaaaaaaaaaa"]));
    session.setQuery("daft");
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    session.setQuery("daft ");
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("keeps the previous results on screen while the next query loads", async () => {
    const { search, session, state } = setup();
    search.mockResolvedValueOnce(page(["aaaaaaaaaaa"]));
    session.setQuery("daft");
    await vi.advanceTimersByTimeAsync(DEBOUNCE);

    search.mockReturnValueOnce(new Promise(() => {}));
    session.setQuery("daft punk");
    expect(state().status).toBe("loading");
    expect(state().results).toEqual([result("aaaaaaaaaaa")]);
  });

  it("discards a response that arrives after its query was superseded", async () => {
    const { search, session, state } = setup();
    const slow = deferred<SearchPage>();
    search.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(page(["bbbbbbbbbbb"]));

    session.setQuery("first");
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    const firstSignal = search.mock.calls[0]?.[1];

    session.setQuery("second");
    expect(firstSignal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(DEBOUNCE);

    slow.resolve(page(["aaaaaaaaaaa"]));
    await vi.runAllTimersAsync();

    expect(state()).toMatchObject({ query: "second", results: [result("bbbbbbbbbbb")] });
  });

  it("reports an error when the search fails", async () => {
    const { search, session, state } = setup();
    search.mockRejectedValue(new Error("502"));
    session.setQuery("daft");
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(state()).toMatchObject({ status: "error", results: [] });
  });

  it("clears back to idle when the field is emptied", async () => {
    const { search, session, state } = setup();
    search.mockResolvedValue(page(["aaaaaaaaaaa"]));
    session.setQuery("daft");
    await vi.advanceTimersByTimeAsync(DEBOUNCE);

    session.setQuery("");
    expect(state()).toEqual(IDLE_SEARCH);
  });

  describe("loadMore", () => {
    async function ready(continuation: string | null = "T1") {
      const env = setup();
      env.search.mockResolvedValue(page(["aaaaaaaaaaa", "bbbbbbbbbbb"], continuation));
      env.session.setQuery("daft");
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
      return env;
    }

    it("appends the next page without duplicating rows", async () => {
      const { searchMore, session, state } = await ready();
      searchMore.mockResolvedValue(page(["bbbbbbbbbbb", "ccccccccccc"], "T2"));

      session.loadMore();
      expect(state().loadingMore).toBe(true);
      await vi.runAllTimersAsync();

      expect(searchMore.mock.calls[0]?.[0]).toBe("T1");
      expect(state().results.map((row) => row.videoId)).toEqual([
        "aaaaaaaaaaa",
        "bbbbbbbbbbb",
        "ccccccccccc",
      ]);
      expect(state()).toMatchObject({ continuation: "T2", loadingMore: false });
    });

    it("asks only once while a page is in flight", async () => {
      const { searchMore, session } = await ready();
      searchMore.mockReturnValue(new Promise(() => {}));
      session.loadMore();
      session.loadMore();
      expect(searchMore).toHaveBeenCalledTimes(1);
    });

    it("does nothing on the last page", async () => {
      const { searchMore, session } = await ready(null);
      session.loadMore();
      expect(searchMore).not.toHaveBeenCalled();
    });

    it("stops paging after a failure but keeps the rows", async () => {
      const { searchMore, session, state } = await ready();
      searchMore.mockRejectedValue(new Error("502"));
      session.loadMore();
      await vi.runAllTimersAsync();
      expect(state()).toMatchObject({ status: "ready", continuation: null, loadingMore: false });
      expect(state().results).toHaveLength(2);
    });

    it("drops a page that lands after the query changed", async () => {
      const { search, searchMore, session, state } = await ready();
      const slow = deferred<SearchPage>();
      searchMore.mockReturnValue(slow.promise);
      session.loadMore();

      search.mockResolvedValue(page(["zzzzzzzzzzz"]));
      session.setQuery("other");
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
      slow.resolve(page(["ccccccccccc"]));
      await vi.runAllTimersAsync();

      expect(state().results.map((row) => row.videoId)).toEqual(["zzzzzzzzzzz"]);
    });
  });

  it("cancels pending work on dispose", async () => {
    const { search, session } = setup();
    session.setQuery("daft");
    session.dispose();
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(search).not.toHaveBeenCalled();
  });
});
