import { describe, expect, it } from "vitest";
import { findActiveLine } from "./findActiveLine";
import type { LyricLine } from "./parseLRC";

const lines: LyricLine[] = [
  { time: 10, text: "a" },
  { time: 20, text: "b" },
  { time: 30, text: "c" },
];

describe("findActiveLine", () => {
  it("returns -1 before the first line starts", () => {
    expect(findActiveLine(lines, 0)).toBe(-1);
    expect(findActiveLine(lines, 9.99)).toBe(-1);
  });

  it("activates a line exactly on its timestamp", () => {
    expect(findActiveLine(lines, 10)).toBe(0);
  });

  it("keeps a line active until the next one starts", () => {
    expect(findActiveLine(lines, 19.99)).toBe(0);
    expect(findActiveLine(lines, 20)).toBe(1);
  });

  it("stays on the last line past the end", () => {
    expect(findActiveLine(lines, 9999)).toBe(2);
  });

  it("handles an empty document", () => {
    expect(findActiveLine([], 42)).toBe(-1);
  });

  it("agrees with a linear scan across a long document", () => {
    // Guards the binary search against off-by-one errors at every boundary.
    const many: LyricLine[] = Array.from({ length: 500 }, (_, index) => ({
      time: index * 2,
      text: `line ${index}`,
    }));

    const linear = (time: number) => {
      let result = -1;
      many.forEach((line, index) => {
        if (line.time <= time) result = index;
      });
      return result;
    };

    for (const time of [-1, 0, 1, 2, 3, 499, 500, 501, 998, 999, 1000]) {
      expect(findActiveLine(many, time)).toBe(linear(time));
    }
  });
});
