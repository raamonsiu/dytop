import { describe, expect, it } from "vitest";
import { MAX_TRACK_DURATION_SECONDS } from "@/constants/player";
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
  it("is a valid manifest entry with a schedulable duration and filled fields", () => {
    expect(RADIO_FALLBACK.videoId.length).toBeGreaterThan(0);
    expect(RADIO_FALLBACK.durationSec).toBeGreaterThan(0);
    // A bound check only. Whether the id behind it is a live stream — the bug
    // this entry used to carry — cannot be seen from here: the duration is
    // hand-written, and a stream's entry simply lied about it.
    expect(RADIO_FALLBACK.durationSec).toBeLessThan(MAX_TRACK_DURATION_SECONDS);
    expect(RADIO_FALLBACK.title.trim().length).toBeGreaterThan(0);
    expect(RADIO_FALLBACK.author.trim().length).toBeGreaterThan(0);
  });

  it("is not also scheduled on its own", () => {
    expect(MANIFEST.some((entry) => entry.videoId === RADIO_FALLBACK.videoId)).toBe(false);
  });

  it("is never itself blocked, since nothing would be left to substitute", () => {
    expect(RADIO_FALLBACK.blocked).toBeUndefined();
  });
});
