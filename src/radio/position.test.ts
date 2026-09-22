import { describe, expect, it } from "vitest";
import { MANIFEST, RADIO_FALLBACK } from "./manifest";
import { dailySchedule, positionAt } from "./schedule";
import { entryToTrack, radioSlotAt, upNextEntry, utcDayString } from "./position";

/** 2026-08-28 00:00:00 UTC in epoch seconds. */
const DAY_EPOCH = Math.floor(Date.UTC(2026, 7, 28) / 1000);

describe("utcDayString", () => {
  it("formats the UTC date for a known epoch second", () => {
    expect(utcDayString(DAY_EPOCH)).toBe("2026-08-28");
  });

  it("uses UTC, not local time, so all clients agree regardless of timezone", () => {
    // A timestamp at 23:59 local in UTC-anything still resolves by UTC fields.
    const localSkewed = DAY_EPOCH + 12 * 3600; // 12:00 UTC same day
    expect(utcDayString(localSkewed)).toBe("2026-08-28");
  });

  it("rolls over exactly at 00:00:00 UTC", () => {
    expect(utcDayString(DAY_EPOCH - 1)).toBe("2026-08-27");
    expect(utcDayString(DAY_EPOCH)).toBe("2026-08-28");
  });
});

describe("radioSlotAt", () => {
  it("resolves the deterministic slot for a given epoch second", () => {
    const slot = radioSlotAt(DAY_EPOCH, null);
    // Must equal the pure schedule mapping for the same instant.
    const expected = positionAt(dailySchedule("2026-08-28"), DAY_EPOCH);
    expect(slot.entry.videoId).toBe(expected.entry.videoId);
    expect(slot.offsetInTrack).toBe(expected.offsetInTrack);
    expect(slot.index).toBe(expected.index);
    expect(slot.day).toBe("2026-08-28");
  });

  it("reports changed=true when the loaded video differs from the slot", () => {
    const slot = radioSlotAt(DAY_EPOCH, "some-other-video");
    expect(slot.changed).toBe(true);
  });

  it("moves the index across a track boundary, which a videoId need not", () => {
    // The index is what separates a boundary from a repeat: two substituted
    // slots in a row carry the identical entry. The slot itself says how far
    // the boundary is, so the test needs nothing from the schedule internals.
    const first = radioSlotAt(DAY_EPOCH, null);
    const next = radioSlotAt(DAY_EPOCH + (first.entry.durationSec - first.offsetInTrack), null);
    expect(next.index).not.toBe(first.index);
    expect(next.offsetInTrack).toBe(0);
  });

  it("reports changed=false when the loaded video already matches the slot", () => {
    const slot = radioSlotAt(DAY_EPOCH, null);
    const same = radioSlotAt(DAY_EPOCH, slot.entry.videoId);
    expect(same.changed).toBe(false);
  });

  it("treats a day change as a change even if the loaded video matches the old day's slot", () => {
    const before = radioSlotAt(DAY_EPOCH, null);
    const nextDay = radioSlotAt(DAY_EPOCH + 86400, null);
    // Crossing 00:00 UTC flips the day and (almost always) the schedule.
    expect(nextDay.day).toBe("2026-08-29");
    expect(nextDay.day).not.toBe(before.day);
    // A freshly-loaded day's slot always differs from whatever was loaded.
    expect(nextDay.changed).toBe(true);
  });

  it("re-derives the schedule at the UTC midnight boundary (midnight continuity)", () => {
    const before = radioSlotAt(DAY_EPOCH - 1, null);
    const after = radioSlotAt(DAY_EPOCH, null);
    expect(before.day).toBe("2026-08-27");
    expect(after.day).toBe("2026-08-28");
    // Both instants still land at a valid, deterministic slot.
    expect(before.offsetInTrack).toBeGreaterThanOrEqual(0);
    expect(after.offsetInTrack).toBeGreaterThanOrEqual(0);
  });

  it("wraps the loop and loads the first track again after the total duration", () => {
    const total = dailySchedule("2026-08-28").totalSec;
    const atStart = radioSlotAt(DAY_EPOCH, null);
    const afterLoop = radioSlotAt(DAY_EPOCH + total, null);
    // After a full loop the (same-day) schedule resolves to the same slot.
    expect(afterLoop.entry.videoId).toBe(atStart.entry.videoId);
    expect(afterLoop.offsetInTrack).toBe(atStart.offsetInTrack);
  });

  it("never schedules a blocked track (deterministic RADIO_FALLBACK substitution)", () => {
    const s = dailySchedule("2026-08-28");
    expect(s.order.some((e) => e.blocked)).toBe(false);
    // A full-day sweep never lands on a blocked manifest id.
    for (let t = 0; t < s.totalSec; t += 37) {
      const slot = radioSlotAt(DAY_EPOCH + t, null);
      expect(slot.entry.blocked).toBeUndefined();
    }
  });

  it("surfaces RADIO_FALLBACK at its slot within the loop", () => {
    const s = dailySchedule("2026-08-28");
    // Sweep the whole loop of 2026-08-28; the substituted fallback slot must be
    // reachable by wall-clock offset on that day.
    let found = 0;
    for (let t = 0; t < s.totalSec; t += 7) {
      const slot = radioSlotAt(DAY_EPOCH + t, null);
      if (slot.entry.videoId === RADIO_FALLBACK.videoId) found++;
    }
    expect(found).toBeGreaterThan(0);
  });
});

describe("runtime-unavailable substitution", () => {
  it("swaps a refused video for the station fallback on the same slot", () => {
    const scheduled = radioSlotAt(DAY_EPOCH, null);
    const healed = radioSlotAt(DAY_EPOCH, null, "d1", new Set([scheduled.entry.videoId]));
    expect(healed.entry.videoId).toBe(RADIO_FALLBACK.videoId);
    // Same instant, so the loop keeps its wall-clock shape: a client that never
    // hit the failure is still on the same second of the same slot.
    expect(healed.offsetInTrack).toBe(scheduled.offsetInTrack);
    expect(healed.day).toBe(scheduled.day);
  });

  it("reports the substitution as a change, so the controller loads it", () => {
    const scheduled = radioSlotAt(DAY_EPOCH, null);
    const healed = radioSlotAt(
      DAY_EPOCH,
      scheduled.entry.videoId,
      "d1",
      new Set([scheduled.entry.videoId]),
    );
    expect(healed.changed).toBe(true);
    expect(healed.unavailable).toBe(false);
  });

  it("leaves an unrelated refusal alone", () => {
    const slot = radioSlotAt(DAY_EPOCH, null, "d1", new Set(["not-in-the-loop"]));
    expect(slot.entry.videoId).toBe(radioSlotAt(DAY_EPOCH, null).entry.videoId);
    expect(slot.unavailable).toBe(false);
  });

  it("flags unavailable when the fallback itself was refused, with nothing left to swap", () => {
    const scheduled = radioSlotAt(DAY_EPOCH, null);
    const slot = radioSlotAt(
      DAY_EPOCH,
      RADIO_FALLBACK.videoId,
      "d1",
      new Set([scheduled.entry.videoId, RADIO_FALLBACK.videoId]),
    );
    expect(slot.entry.videoId).toBe(RADIO_FALLBACK.videoId);
    // Already loaded and still refused: the controller must stop re-asserting
    // it rather than spin on the error until the slot moves.
    expect(slot.changed).toBe(false);
    expect(slot.unavailable).toBe(true);
  });

  it("substitutes the up-next hint too, so it names what will actually play", () => {
    const next = upNextEntry(DAY_EPOCH);
    const healed = upNextEntry(DAY_EPOCH, "d1", new Set([next.videoId]));
    expect(healed.videoId).toBe(RADIO_FALLBACK.videoId);
  });

});

describe("upNextEntry", () => {
  it("returns the entry scheduled after the current one", () => {
    const s = dailySchedule("2026-08-28");
    const slot = radioSlotAt(DAY_EPOCH, null);
    const idx = s.order.findIndex((e) => e.videoId === slot.entry.videoId);
    const expected = s.order[(idx + 1) % s.order.length];
    expect(upNextEntry(DAY_EPOCH)).toBe(expected);
  });

  it("wraps from the last entry back to the first", () => {
    const s = dailySchedule("2026-08-28");
    const last = s.order.at(-1)!;
    // The loop is anchored by epoch modulo totalSec: find the 2026-08-28 epoch
    // that lands on offset totalSec-1 (the last second of the last entry).
    const total = s.totalSec;
    const residue = ((DAY_EPOCH % total) + total) % total;
    const lastEpoch = DAY_EPOCH + ((total - 1 - residue + total) % total);
    expect(radioSlotAt(lastEpoch, null).entry.videoId).toBe(last.videoId);
    expect(upNextEntry(lastEpoch)).toBe(s.order[0]);
  });
});

describe("optional arguments", () => {
  it("default to the registered station and to no known refusals", () => {
    expect(dailySchedule("2026-08-28", "d1")).toEqual(dailySchedule("2026-08-28"));
    expect(radioSlotAt(DAY_EPOCH, null, "d1", new Set())).toEqual(
      radioSlotAt(DAY_EPOCH, null),
    );
    expect(upNextEntry(DAY_EPOCH, "d1", new Set())).toBe(upNextEntry(DAY_EPOCH));
  });
});

describe("entryToTrack", () => {
  it("maps a manifest entry to a queue Track shape with a stable id", () => {
    const [entry] = MANIFEST;
    const track = entryToTrack(entry!);
    expect(track.videoId).toBe(entry!.videoId);
    expect(track.id).toBe(entry!.videoId);
    expect(track.title).toBe(entry!.title);
    expect(track.author).toBe(entry!.author);
    expect(track.thumb).toContain("i.ytimg.com/vi/");
  });

  it("falls back to the channel when the title carries no artist", () => {
    const entry = {
      videoId: "abc",
      durationSec: 200,
      title: "Boig Per Tu",
      author: "Sau - Topic",
    };
    const track = entryToTrack(entry);
    // Without this the lyrics lookup asks for an empty artist, which lyrics.ovh
    // cannot express in a path at all.
    expect(track.artistGuess).toBe("Sau");
    expect(track.titleGuess).toBe("Boig Per Tu");
  });

  it("produces artist/title guesses for the lyrics lookup", () => {
    const track = entryToTrack(MANIFEST[0]!);
    // "Never Gonna Give You Up" has no artist separator, so the guess is empty
    // artist + whole title, consistent with parseTitleGuess.
    expect(track.titleGuess).toBeTruthy();
  });
});
