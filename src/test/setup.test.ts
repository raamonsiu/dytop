import { describe, expect, it } from "vitest";

/** Guards the harness itself: if setup.ts stops being loaded, the IndexedDB
 * repo tests would fail later with a confusing "indexedDB is not defined"
 * instead of pointing at the config. */
describe("test harness", () => {
  it("provides an IndexedDB implementation", () => {
    expect(typeof indexedDB.open).toBe("function");
  });
});
