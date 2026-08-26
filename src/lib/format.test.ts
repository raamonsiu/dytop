import { describe, expect, it } from "vitest";
import { formatRemaining, formatTime } from "./format";

describe("formatTime", () => {
  it.each([
    [0, "0:00"],
    [9, "0:09"],
    [59, "0:59"],
    [60, "1:00"],
    [125, "2:05"],
    [599, "9:59"],
    [3599, "59:59"],
  ])("formats %ds as %s", (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });

  it("switches to h:mm:ss past an hour", () => {
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3661)).toBe("1:01:01");
  });

  it("truncates fractional seconds rather than rounding up", () => {
    // Rounding would make a clock read 1:00 while the track is still at 0:59.
    expect(formatTime(59.9)).toBe("0:59");
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["negative", -5],
  ])("falls back to 0:00 for %s", (_label, input) => {
    // The player reports these while metadata is still loading.
    expect(formatTime(input)).toBe("0:00");
  });
});

describe("formatRemaining", () => {
  it("counts down from the duration", () => {
    expect(formatRemaining(30, 125)).toBe("-1:35");
  });

  it("clamps at zero once past the end", () => {
    expect(formatRemaining(130, 125)).toBe("-0:00");
  });

  it("returns 0:00 when the duration is unknown or live", () => {
    expect(formatRemaining(30, 0)).toBe("0:00");
  });
});
