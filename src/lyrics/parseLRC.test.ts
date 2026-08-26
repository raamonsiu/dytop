import { describe, expect, it } from "vitest";
import { parseLRC } from "./parseLRC";

// Placeholder text throughout — the parser cares about timestamps, not words.

describe("parseLRC", () => {
  it("parses timestamped lines in order", () => {
    const lrc = ["[00:12.50]line one", "[00:15.00]line two"].join("\n");
    expect(parseLRC(lrc)).toEqual([
      { time: 12.5, text: "line one" },
      { time: 15, text: "line two" },
    ]);
  });

  it("sorts by time even when the source is out of order", () => {
    const lrc = ["[00:20.00]later", "[00:05.00]earlier"].join("\n");
    expect(parseLRC(lrc).map((line) => line.text)).toEqual(["earlier", "later"]);
  });

  it("expands a line carrying several timestamps", () => {
    // How LRC stores a repeated chorus: written once, pointed at many times.
    const parsed = parseLRC("[00:10.00][01:10.00][02:10.00]chorus");
    expect(parsed).toEqual([
      { time: 10, text: "chorus" },
      { time: 70, text: "chorus" },
      { time: 130, text: "chorus" },
    ]);
  });

  it("reads two-digit fractions as centiseconds", () => {
    expect(parseLRC("[00:01.5]x")[0]?.time).toBe(1.5);
    expect(parseLRC("[00:01.05]x")[0]?.time).toBe(1.05);
  });

  it("reads three-digit fractions as milliseconds", () => {
    expect(parseLRC("[00:01.250]x")[0]?.time).toBe(1.25);
  });

  it("accepts a colon before the fraction", () => {
    expect(parseLRC("[00:01:250]x")[0]?.time).toBe(1.25);
  });

  it("handles minutes past 99", () => {
    expect(parseLRC("[100:00.00]x")[0]?.time).toBe(6000);
  });

  it("accepts unpadded minutes", () => {
    expect(parseLRC("[1:30.00]x")[0]?.time).toBe(90);
  });

  it("keeps timestamps with no text", () => {
    // Instrumental gaps: dropping them would leave the previous line lit
    // through the whole break.
    expect(parseLRC("[00:30.00]")).toEqual([{ time: 30, text: "" }]);
  });

  it("ignores metadata headers and untimed lines", () => {
    const lrc = ["[ar:Someone]", "[ti:Something]", "", "[00:01.00]only this"].join("\n");
    expect(parseLRC(lrc)).toEqual([{ time: 1, text: "only this" }]);
  });

  it("returns an empty list for an empty document", () => {
    expect(parseLRC("")).toEqual([]);
  });

  it("trims whitespace around the text", () => {
    expect(parseLRC("[00:01.00]   spaced   ")[0]?.text).toBe("spaced");
  });
});
