import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The controller is the impure radio module: it only turns slot decisions into
// calls on the one shared embed. Mocking that embed (and the lyrics fetch it
// triggers) is what lets the start/stop handoff contract be asserted at all.
vi.mock("@/lyrics/lyricsStore", () => ({ loadLyricsFor: vi.fn() }));
vi.mock("@/player/engine", () => ({
  currentVideoFailed: vi.fn(() => false),
  getAdvanceHandler: vi.fn(() => null),
  getCurrentTime: vi.fn(() => 0),
  hasUserInteracted: vi.fn(() => true),
  load: vi.fn(),
  onAdvanceRequested: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  seek: vi.fn(),
}));

import { getCurrentTime, load, pause } from "@/player/engine";
import { playerStore, setPlayerState } from "@/player/playerStore";
import { queueStore } from "@/player/queueStore";
import type { Track } from "@/player/types";
import { radioStore, startRadio, stopRadio } from "./controller";

const TRACK: Track = {
  id: "entry-1",
  videoId: "queue-video",
  title: "Queued Song",
  author: "Someone",
  thumb: "https://i.ytimg.com/vi/queue-video/hqdefault.jpg",
  artistGuess: "Someone",
  titleGuess: "Queued Song",
};

/** `stopRadio` defers its teardown by one microtask so a view swap can cancel
 * it (see the `pendingStop` guard); the restore only runs after that. */
async function stopAndSettle(): Promise<void> {
  stopRadio();
  await Promise.resolve();
}

afterEach(async () => {
  // Each test leaves the module's session state behind (and its 1s tick), so
  // the next one would start mid-session.
  stopRadio();
  await Promise.resolve();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentTime).mockReturnValue(0);
  queueStore.set({ history: [], nowPlaying: null, upcoming: [] });
  setPlayerState({ status: "idle", duration: 0, errorKey: null });
});

describe("session lifecycle", () => {
  it("leaves the embed alone when the same station is started again", () => {
    // What a legacy/minimal view swap does: unmount one radio view and mount
    // the other for the same /radio session, in the same commit.
    startRadio();
    vi.mocked(load).mockClear();

    stopRadio();
    startRadio();

    expect(load).not.toHaveBeenCalled();
    expect(radioStore.get().active).toBe(true);
  });

  it("does not tear the session down when the paired start cancels the stop", async () => {
    startRadio();
    stopRadio();
    startRadio();
    await Promise.resolve();

    // The deferred teardown must have been cancelled outright, not merely
    // delayed past the start that overtook it.
    expect(pause).not.toHaveBeenCalled();
    expect(radioStore.get().active).toBe(true);
  });
});

describe("personal-queue handoff", () => {
  it("resumes a queue that was playing when radio took the embed over", async () => {
    queueStore.set({ history: [], nowPlaying: TRACK, upcoming: [] });
    setPlayerState({ status: "playing" });
    vi.mocked(getCurrentTime).mockReturnValue(42);

    startRadio();
    // Discard the radio slot's own load: only the restore is under test.
    vi.mocked(load).mockClear();
    await stopAndSettle();

    expect(load).toHaveBeenCalledWith("queue-video", true, 42);
  });

  it("cues back a queue that was only restored, never played", async () => {
    // What a fresh load leaves behind: initPlayer cues the saved session
    // without playing it, so visiting radio and leaving must not start it.
    queueStore.set({ history: [], nowPlaying: TRACK, upcoming: [] });
    setPlayerState({ status: "paused" });

    startRadio();
    vi.mocked(load).mockClear();
    await stopAndSettle();

    expect(load).toHaveBeenCalledWith("queue-video", false, 0);
    // Cueing reports no status of its own, so the transport would spin forever
    // on "loading" without this.
    expect(playerStore.get().status).toBe("paused");
  });

  it("pauses the embed when there was no queue track to restore", async () => {
    startRadio();
    vi.mocked(load).mockClear();
    await stopAndSettle();

    expect(load).not.toHaveBeenCalled();
    expect(pause).toHaveBeenCalled();
  });
});
