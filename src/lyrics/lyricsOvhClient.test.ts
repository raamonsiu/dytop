import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLyrics } from "./lyricsOvhClient";

describe("lyrics.ovh client", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it.each([
    ["no artist", "", "Boig Per Tu"],
    ["a blank artist", "   ", "Boig Per Tu"],
    ["no title", "Sau", ""],
  ])("asks for nothing given %s", async (_label, artist, title) => {
    expect(await fetchLyrics(artist, title)).toEqual({ status: "not-found" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
