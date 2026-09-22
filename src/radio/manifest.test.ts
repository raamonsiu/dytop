import { describe, expect, it } from "vitest";
import { MAX_TRACK_DURATION_SECONDS } from "@/constants/player";
import { MANIFEST, RADIO_FALLBACK, RADIO_STATIONS } from "./manifest";

describe("MANIFEST", () => {
  it("has at least 8 hand-authored tracks", () => {
    expect(MANIFEST.length).toBeGreaterThanOrEqual(8);
  });
});

// Station files are generated, so the invariants the schedule relies on are
// checked for every registered station rather than trusted to the script.
describe.each(Object.values(RADIO_STATIONS))("station $id", (station) => {
  it("has at least one track", () => {
    expect(station.manifest.length).toBeGreaterThan(0);
  });

  it("has unique videoIds", () => {
    const ids = station.manifest.map((entry) => entry.videoId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has a schedulable duration and filled title/author", () => {
    for (const entry of station.manifest) {
      expect(entry.durationSec).toBeGreaterThan(0);
      expect(entry.durationSec).toBeLessThan(MAX_TRACK_DURATION_SECONDS);
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.author.trim().length).toBeGreaterThan(0);
    }
  });

  it("does not schedule its fallback on its own", () => {
    expect(station.manifest.some((entry) => entry.videoId === station.fallback.videoId)).toBe(false);
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
