import { describe, expect, it } from "vitest";
import { MANIFEST, RADIO_FALLBACK } from "./manifest";
import { dailySchedule, positionAt } from "./schedule";

const DAY = "2026-08-28";

describe("dailySchedule", () => {
  it("is deterministic for the same UTC day", () => {
    expect(dailySchedule(DAY)).toEqual(dailySchedule(DAY));
  });

  it("computes a prefix-sum schedule whose total matches the manifest", () => {
    const s = dailySchedule(DAY);
    const manifestTotal = MANIFEST.reduce(
      (sum, entry) => sum + (entry.blocked ? RADIO_FALLBACK.durationSec : entry.durationSec),
      0,
    );
    expect(s.totalSec).toBe(manifestTotal);
    expect(s.prefixSums.at(-1)).toBe(s.totalSec);
  });

  it("is a permutation of the manifest with blocked tracks substituted (each effective track exactly once)", () => {
    const s = dailySchedule(DAY);
    expect(s.order.length).toBe(MANIFEST.length);
    const expectedIds = MANIFEST.map((entry) =>
      entry.blocked ? RADIO_FALLBACK.videoId : entry.videoId,
    ).sort();
    expect(s.order.map((entry) => entry.videoId).sort()).toEqual(expectedIds);
  });

  it("shuffles durations in lockstep with their track (prefix sums stay valid)", () => {
    const s = dailySchedule(DAY);
    let running = 0;
    s.order.forEach((entry, i) => {
      running += entry.durationSec;
      expect(s.prefixSums[i]).toBe(running);
    });
  });

  it("produces a different order for a different day (day change)", () => {
    expect(dailySchedule(DAY).order).not.toEqual(dailySchedule("2026-08-29").order);
  });
});

describe("positionAt", () => {
  const s = dailySchedule(DAY);

  it("maps offset 0 to the first track at second 0", () => {
    const at = positionAt(s, 0);
    expect(at.entry.videoId).toBe(s.order[0]?.videoId);
    expect(at.offsetInTrack).toBe(0);
  });

  it("maps offset T-1 to the last second of the last track", () => {
    const at = positionAt(s, s.totalSec - 1);
    expect(at.entry.videoId).toBe(s.order.at(-1)?.videoId);
    expect(at.offsetInTrack).toBe(s.order.at(-1)!.durationSec - 1);
  });

  it("wraps at T back to the first track at second 0", () => {
    expect(positionAt(s, s.totalSec)).toEqual(positionAt(s, 0));
  });

  it("resolves an offset inside a later track via prefix sums", () => {
    const offset = s.prefixSums[1]! - 1;
    const at = positionAt(s, offset);
    expect(at.entry.videoId).toBe(s.order[1]?.videoId);
    expect(at.offsetInTrack).toBe((s.order[1]?.durationSec ?? 0) - 1);
  });

  it("is continuous across midnight: offset maps within the same loop for any day", () => {
    const a = positionAt(dailySchedule(DAY), 0);
    const b = positionAt(dailySchedule("2026-08-29"), 0);
    // A fresh day replaces the order but the offset still lands at second 0 of some track.
    expect(a.offsetInTrack).toBe(0);
    expect(b.offsetInTrack).toBe(0);
  });

  it("normalizes negative offsets without throwing (floor-mod wrap)", () => {
    const at = positionAt(s, -1);
    expect(at.offsetInTrack).toBeGreaterThanOrEqual(0);
    expect(at.offsetInTrack).toBeLessThan(at.entry.durationSec);
  });

  it("returns a safe fallback for an empty schedule", () => {
    const empty = { order: [], prefixSums: [], totalSec: 0 };
    const at = positionAt(empty, 123);
    expect(at.entry.videoId).toBe(RADIO_FALLBACK.videoId);
    expect(at.offsetInTrack).toBe(0);
  });

  it("distinguishes two slots that substitute the identical fallback entry by index, not videoId", () => {
    // Two blocked slots both resolve to the same RADIO_FALLBACK object, so a
    // videoId-based lookup (the pre-fix bug in upNextEntry) can't tell them
    // apart; `index` must, since it comes straight from the schedule position.
    const duplicateFallback = {
      order: [RADIO_FALLBACK, MANIFEST[0]!, RADIO_FALLBACK],
      prefixSums: [
        RADIO_FALLBACK.durationSec,
        RADIO_FALLBACK.durationSec + MANIFEST[0]!.durationSec,
        2 * RADIO_FALLBACK.durationSec + MANIFEST[0]!.durationSec,
      ],
      totalSec: 2 * RADIO_FALLBACK.durationSec + MANIFEST[0]!.durationSec,
    };

    const first = positionAt(duplicateFallback, 0);
    const second = positionAt(
      duplicateFallback,
      RADIO_FALLBACK.durationSec + MANIFEST[0]!.durationSec,
    );

    expect(first.entry.videoId).toBe(RADIO_FALLBACK.videoId);
    expect(second.entry.videoId).toBe(RADIO_FALLBACK.videoId);
    expect(first.index).toBe(0);
    expect(second.index).toBe(2);
  });
});

describe("blocked-track substitution", () => {
  it("never schedules a blocked track; substitutes it with RADIO_FALLBACK", () => {
    const s = dailySchedule(DAY);
    expect(s.order.some((entry) => entry.blocked)).toBe(false);
    expect(s.order.filter((entry) => entry.videoId === RADIO_FALLBACK.videoId)).toHaveLength(1);
  });

  it("keeps the fallback fixed and the slot count identical across dates", () => {
    const a = dailySchedule(DAY);
    const b = dailySchedule("2026-08-29");
    // Both days fill their (differently positioned) blocked slot with the same content.
    const fallbackCountA = a.order.filter((e) => e.videoId === RADIO_FALLBACK.videoId).length;
    const fallbackCountB = b.order.filter((e) => e.videoId === RADIO_FALLBACK.videoId).length;
    expect(fallbackCountA).toBe(1);
    expect(fallbackCountB).toBe(1);
    expect(a.order.length).toBe(b.order.length);
  });
});
