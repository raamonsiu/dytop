import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Its own file on purpose: the controller remembers refused videos for the
// page's lifetime, and Vitest gives each test file a fresh module registry, so
// the refusal recorded here cannot leak into the handoff tests next door.
vi.mock("@/lyrics/lyricsStore", () => ({ loadLyricsFor: vi.fn() }));
vi.mock("@/player/engine", () => ({
  getAdvanceHandler: vi.fn(() => null),
  getCurrentTime: vi.fn(() => 0),
  hasUserInteracted: vi.fn(() => true),
  load: vi.fn(),
  onAdvanceRequested: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  seek: vi.fn(),
}));

import { type AdvanceReason, load, onAdvanceRequested } from "@/player/engine";
import { RADIO_FALLBACK } from "./manifest";
import { radioStore, startRadio, stopRadio } from "./controller";

/**
 * Starts radio at a pinned instant and returns what it scheduled, plus the
 * handler it installed on the engine.
 *
 * Each test pins a different day: a refusal is remembered for the module's
 * whole life, so two tests sharing a slot would find it already substituted.
 */
function startAt(utcMs: number): { scheduled: string; heal: (reason: AdvanceReason) => void } {
  vi.setSystemTime(utcMs);
  startRadio();
  const heal = vi.mocked(onAdvanceRequested).mock.calls[0]?.[0];
  if (!heal) throw new Error("startRadio did not install an advance handler");
  const scheduled = radioStore.get().entry!.videoId;
  expect(scheduled).not.toBe(RADIO_FALLBACK.videoId);
  return { scheduled, heal };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(async () => {
  stopRadio();
  await Promise.resolve();
  vi.useRealTimers();
});

describe("a video the embed refuses", () => {
  it("is swapped for the station fallback on the same slot", () => {
    const { scheduled, heal } = startAt(Date.UTC(2026, 7, 28, 12));
    vi.mocked(load).mockClear();

    heal({ kind: "refused", videoId: scheduled });

    expect(load).toHaveBeenCalledWith(RADIO_FALLBACK.videoId, true, expect.any(Number));
    expect(radioStore.get().entry!.videoId).toBe(RADIO_FALLBACK.videoId);
  });

  it("is acted on even when a heal already ran in the same second", () => {
    // The debounce exists for repeating ENDED storms; a refusal arrives once,
    // so swallowing it would leave the slot silent until the next boundary.
    const { scheduled, heal } = startAt(Date.UTC(2026, 7, 29, 12));
    heal({ kind: "ended" });
    vi.mocked(load).mockClear();

    heal({ kind: "refused", videoId: scheduled });

    expect(load).toHaveBeenCalledWith(RADIO_FALLBACK.videoId, true, expect.any(Number));
  });
});
