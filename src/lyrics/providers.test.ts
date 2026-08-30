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

  it("stops trying providers once the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const untouched = provider({ status: "plain", text: "unreachable" });

    const result = await fetchLyrics("artist", "title", controller.signal, [untouched]);

    expect(result).toEqual({ status: "not-found" });
    expect(untouched).not.toHaveBeenCalled();
  });
});
