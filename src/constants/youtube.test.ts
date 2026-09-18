import { describe, expect, it } from "vitest";
import { SKIPPABLE_YT_ERROR_CODES, YT_ERROR_KEYS } from "./youtube";

describe("player error classification", () => {
  it.each([
    ["invalid id", 2],
    ["not found", 100],
    ["embedding disabled", 101],
    ["embedding disabled (alias)", 150],
  ])("skips past a %s, which only breaks its own entry", (_label, code) => {
    expect(SKIPPABLE_YT_ERROR_CODES.has(code)).toBe(true);
  });

  it.each([
    ["html5 fault", 5],
    ["origin rejection", 153],
  ])("holds on a %s, which would break every entry alike", (_label, code) => {
    // Skipping here would silently burn through the whole queue instead of
    // showing the problem once.
    expect(SKIPPABLE_YT_ERROR_CODES.has(code)).toBe(false);
  });

  it("names every classified code, so the UI never falls back to unknown", () => {
    for (const code of SKIPPABLE_YT_ERROR_CODES) {
      expect(YT_ERROR_KEYS[code]).toBeTruthy();
    }
  });
});
