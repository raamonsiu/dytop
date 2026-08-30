import { describe, expect, it } from "vitest";
import { MANIFEST, RADIO_FALLBACK } from "./manifest";

describe("MANIFEST", () => {
  it("has at least 8 hand-authored tracks", () => {
    expect(MANIFEST.length).toBeGreaterThanOrEqual(8);
  });

  it("has unique videoIds", () => {
    const ids = MANIFEST.map((entry) => entry.videoId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has a positive duration and filled title/author", () => {
    for (const entry of MANIFEST) {
      expect(entry.durationSec).toBeGreaterThan(0);
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.author.trim().length).toBeGreaterThan(0);
    }
  });

  it("totals a positive loop duration", () => {
    const total = MANIFEST.reduce((sum, entry) => sum + entry.durationSec, 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe("RADIO_FALLBACK", () => {
  it("is a valid manifest entry with a positive duration and filled fields", () => {
    expect(RADIO_FALLBACK.videoId.length).toBeGreaterThan(0);
    expect(RADIO_FALLBACK.durationSec).toBeGreaterThan(0);
    expect(RADIO_FALLBACK.title.trim().length).toBeGreaterThan(0);
    expect(RADIO_FALLBACK.author.trim().length).toBeGreaterThan(0);
  });
});
