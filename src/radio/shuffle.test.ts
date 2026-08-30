import { describe, expect, it } from "vitest";
import { dailySeed, mulberry32, fisherYates } from "./shuffle";

describe("dailySeed", () => {
  it("turns a UTC day string into a stable integer seed", () => {
    expect(dailySeed("2026-08-28")).toBe(20260828);
    expect(dailySeed("2026-01-05")).toBe(20260105);
  });

  it("produces distinct seeds for adjacent days", () => {
    expect(dailySeed("2026-08-28")).not.toBe(dailySeed("2026-08-29"));
  });
});

describe("mulberry32", () => {
  it("is deterministic for the same seed", () => {
    const a = mulberry32(20260828);
    const b = mulberry32(20260828);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it("returns values in the [0, 1) range", () => {
    const rand = mulberry32(20260828);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("differs for different seeds", () => {
    expect(mulberry32(20260828)()).not.toBe(mulberry32(20260829)());
  });
});

describe("fisherYates", () => {
  it("deterministically permutes the same input into the same golden order", () => {
    const input = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const rand = mulberry32(dailySeed("2026-08-28"));
    expect(fisherYates(input, rand)).toEqual([
      "a",
      "f",
      "c",
      "h",
      "g",
      "b",
      "e",
      "d",
    ]);
  });

  it("keeps the set of items intact (a permutation)", () => {
    const input = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const rand = mulberry32(dailySeed("2026-08-28"));
    const out = fisherYates(input, rand);
    expect([...out].sort()).toEqual([...input].sort());
    expect(new Set(out).size).toBe(input.length);
  });

  it("does not mutate the caller's array", () => {
    const input = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const snapshot = [...input];
    fisherYates(input, mulberry32(dailySeed("2026-08-28")));
    expect(input).toEqual(snapshot);
  });

  it("shuffles [entry, duration] pairs so durations travel with their track", () => {
    const pairs: [string, number][] = [
      ["a", 10],
      ["b", 20],
      ["c", 30],
      ["d", 40],
    ];
    const rand = mulberry32(dailySeed("2026-08-28"));
    const out = fisherYates(pairs, rand);
    for (const [label, duration] of out) {
      expect(duration).toBe(label === "a" ? 10 : label === "b" ? 20 : label === "c" ? 30 : 40);
    }
    expect(out.map(([label]) => label)).toEqual(["d", "a", "c", "b"]);
  });
});
