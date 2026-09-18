import { describe, expect, it, vi } from "vitest";
import { fetchLyrics } from "./providers";
import type { LyricsProviderFetch, LyricsResult } from "./types";

function provider(result: LyricsResult): LyricsProviderFetch {
  return vi.fn().mockResolvedValue(result);
}

describe("fetchLyrics (multi-provider fallback)", () => {
  it("returns the first provider's result without touching the rest", async () => {
    const first = provider({ status: "plain", text: "found it" });
    const second = provider({ status: "plain", text: "should not be reached" });

    const result = await fetchLyrics("artist", "title", undefined, [first, second]);

    expect(result).toEqual({ status: "plain", text: "found it" });
    expect(second).not.toHaveBeenCalled();
  });

  it("falls back to the next provider on error", async () => {
    const broken = provider({ status: "error" });
    const working = provider({ status: "plain", text: "backup lyrics" });

    const result = await fetchLyrics("artist", "title", undefined, [broken, working]);

    expect(result).toEqual({ status: "plain", text: "backup lyrics" });
  });

  it("falls back to the next provider when one has no lyrics for the track", async () => {
    const empty = provider({ status: "not-found" });
    const working = provider({ status: "synced", lines: [{ time: 0, text: "la la" }] });

    const result = await fetchLyrics("artist", "title", undefined, [empty, working]);

    expect(result).toEqual({ status: "synced", lines: [{ time: 0, text: "la la" }] });
  });

  it("reports not-found when every provider has none, even if another errored", async () => {
    const broken = provider({ status: "error" });
    const empty = provider({ status: "not-found" });

    const result = await fetchLyrics("artist", "title", undefined, [broken, empty]);

    expect(result).toEqual({ status: "not-found" });
  });

  it("reports error only when no provider ever found the track", async () => {
    const brokenA = provider({ status: "error" });
    const brokenB = provider({ status: "error" });

    const result = await fetchLyrics("artist", "title", undefined, [brokenA, brokenB]);

    expect(result).toEqual({ status: "error" });
  });

  it("counts the swapped pass towards not-found rather than error", async () => {
    // Four misses across two providers and two query orders is still a
    // confident "this track has no lyrics", not a failure.
    const empty = provider({ status: "not-found" });

    const result = await fetchLyrics("artist", "title", undefined, [empty]);

    expect(result).toEqual({ status: "not-found" });
    expect(empty).toHaveBeenCalledTimes(2);
  });

  it("stops trying providers once the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const untouched = provider({ status: "plain", text: "unreachable" });

    const result = await fetchLyrics("artist", "title", controller.signal, [untouched]);

    expect(result).toEqual({ status: "not-found" });
    expect(untouched).not.toHaveBeenCalled();
  });
});

describe("fetchLyrics (inverted-title retry)", () => {
  /** Answers only for one exact (artist, title) pair, like a real provider. */
  function onlyFor(wantArtist: string, wantTitle: string): LyricsProviderFetch {
    return vi.fn((artist: string, title: string) =>
      Promise.resolve<LyricsResult>(
        artist === wantArtist && title === wantTitle
          ? { status: "plain", text: "found it" }
          : { status: "not-found" },
      ),
    );
  }

  it("retries with the terms swapped when the natural order finds nothing", async () => {
    // "Tokyo (amb lletra) - Els Catarres" parses to artist "Tokyo", and the
    // provider only knows the song the other way round.
    const source = onlyFor("Els Catarres", "Tokyo");

    const result = await fetchLyrics("Tokyo", "Els Catarres", undefined, [source]);

    expect(result).toEqual({ status: "plain", text: "found it" });
    expect(source).toHaveBeenNthCalledWith(1, "Tokyo", "Els Catarres", undefined);
    expect(source).toHaveBeenNthCalledWith(2, "Els Catarres", "Tokyo", undefined);
  });

  it("exhausts every provider in the natural order before swapping anything", async () => {
    // The natural reading on a second source beats a swapped one on the first.
    const first = onlyFor("never", "matches");
    const second = onlyFor("Radiohead", "Creep");

    const result = await fetchLyrics("Radiohead", "Creep", undefined, [first, second]);

    expect(result).toEqual({ status: "plain", text: "found it" });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("never swaps when the natural order already answered", async () => {
    const source = onlyFor("Radiohead", "Creep");

    await fetchLyrics("Radiohead", "Creep", undefined, [source]);

    expect(source).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["there is no artist to swap in", "", "Boig Per Tu"],
    ["the artist is only blank space", "   ", "Boig Per Tu"],
    ["both terms are already the same", "Zumba", "Zumba"],
  ])("skips the swap when %s", async (_label, artist, title) => {
    const empty = provider({ status: "not-found" });

    await fetchLyrics(artist, title, undefined, [empty]);

    expect(empty).toHaveBeenCalledTimes(1);
  });

  it("does not start the swapped pass once the signal is aborted", async () => {
    const controller = new AbortController();
    const source = vi.fn(() => {
      controller.abort();
      return Promise.resolve<LyricsResult>({ status: "not-found" });
    });

    const result = await fetchLyrics("Tokyo", "Els Catarres", controller.signal, [source]);

    expect(result).toEqual({ status: "not-found" });
    expect(source).toHaveBeenCalledTimes(1);
  });
});
