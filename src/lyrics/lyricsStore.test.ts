import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./providers", () => ({ fetchLyrics: vi.fn() }));

import { getPrefs, setPref } from "@/lib/prefs";
import type { Track } from "@/player/types";
import { fetchLyrics } from "./providers";
import type { LyricsResult } from "./types";
import { loadLyricsFor, lyricsStore } from "./lyricsStore";

/** Distinct ids per test: the store's `lastTrackId` is module state that
 * deliberately outlives a single lookup, so tests must not share a track. */
function track(id: string): Track {
  return {
    id,
    videoId: id,
    title: "A Song",
    author: "A Channel",
    thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    artistGuess: "An Artist",
    titleGuess: "A Song",
  };
}

const SYNCED: LyricsResult = { status: "synced", lines: [{ time: 0, text: "one" }] };

/** `loadLyricsFor` is sync and settles its lookup on a microtask. */
const settle = () => Promise.resolve();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchLyrics).mockResolvedValue(SYNCED);
});

describe("loadLyricsFor", () => {
  it("looks a new track up once and stores the result", async () => {
    loadLyricsFor(track("new-track"));
    await settle();

    expect(fetchLyrics).toHaveBeenCalledTimes(1);
    expect(lyricsStore.get()).toEqual(SYNCED);
  });

  it("ignores a repeat request for the track already showing", async () => {
    loadLyricsFor(track("repeat-track"));
    await settle();
    vi.mocked(fetchLyrics).mockClear();

    // What radio's heal does on every tab refocus and midnight re-sync.
    loadLyricsFor(track("repeat-track"));
    loadLyricsFor(track("repeat-track"));
    await settle();

    expect(fetchLyrics).not.toHaveBeenCalled();
    // Still the words, never a flash back to "loading".
    expect(lyricsStore.get()).toEqual(SYNCED);
  });

  it("leaves a manual delay alone when the same track is re-requested", async () => {
    loadLyricsFor(track("delay-track"));
    await settle();
    setPref("lyricsDelay", 1.5);

    loadLyricsFor(track("delay-track"));

    expect(getPrefs().lyricsDelay).toBe(1.5);
  });

  it("looks up and resets the delay on a genuine track change", async () => {
    loadLyricsFor(track("first-track"));
    await settle();
    setPref("lyricsDelay", 1.5);
    vi.mocked(fetchLyrics).mockClear();

    loadLyricsFor(track("second-track"));
    await settle();

    expect(fetchLyrics).toHaveBeenCalledTimes(1);
    expect(getPrefs().lyricsDelay).toBe(0);
  });

  it("retries the same track after a failed lookup", async () => {
    vi.mocked(fetchLyrics).mockResolvedValue({ status: "error" });
    loadLyricsFor(track("flaky-track"));
    await settle();
    expect(lyricsStore.get().status).toBe("error");

    // A heal is exactly when a transient outage deserves another attempt.
    vi.mocked(fetchLyrics).mockResolvedValue(SYNCED);
    loadLyricsFor(track("flaky-track"));
    await settle();

    expect(fetchLyrics).toHaveBeenCalledTimes(2);
    expect(lyricsStore.get()).toEqual(SYNCED);
  });

  it("goes idle when there is no track, and stays there", () => {
    loadLyricsFor(track("cleared-track"));
    loadLyricsFor(null);
    expect(lyricsStore.get()).toEqual({ status: "idle" });

    vi.mocked(fetchLyrics).mockClear();
    loadLyricsFor(null);
    expect(fetchLyrics).not.toHaveBeenCalled();
    expect(lyricsStore.get()).toEqual({ status: "idle" });
  });
});
