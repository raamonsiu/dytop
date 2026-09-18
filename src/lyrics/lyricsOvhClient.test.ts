import { describe, expect, it, vi } from "vitest";
import { fetchLyrics } from "./lyricsOvhClient";

describe("lyrics.ovh client", () => {
  it("asks for nothing when the artist is missing", async () => {
    // Artist and title are path segments, so an empty artist would build
    // ".../v1//Song" — a URL that can never match.
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(await fetchLyrics("", "Boig Per Tu")).toEqual({ status: "not-found" });
    expect(await fetchLyrics("   ", "Boig Per Tu")).toEqual({ status: "not-found" });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("asks for nothing when the title is missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(await fetchLyrics("Sau", "")).toEqual({ status: "not-found" });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
