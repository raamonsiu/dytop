import { describe, expect, it } from "vitest";
import { detectLocale } from "./config";

describe("detectLocale", () => {
  it.each([
    ["en", ["en"]],
    ["es", ["es"]],
    ["ca", ["ca"]],
  ])("matches %s exactly", (expected, languages) => {
    expect(detectLocale(languages)).toBe(expected);
  });

  it.each([
    ["es", ["es-ES"]],
    ["es", ["es-AR"]],
    ["es", ["es-MX"]],
    ["en", ["en-GB"]],
    ["ca", ["ca-ES"]],
  ])("resolves %s from a regional tag", (expected, languages) => {
    // Matching the full tag would send most Spanish speakers to English.
    expect(detectLocale(languages)).toBe(expected);
  });

  it("honours the browser's order of preference", () => {
    expect(detectLocale(["ca-ES", "es-ES", "en-US"])).toBe("ca");
    expect(detectLocale(["es-ES", "ca-ES"])).toBe("es");
  });

  it("skips unsupported languages to reach a supported one", () => {
    expect(detectLocale(["de-DE", "fr-FR", "es-ES"])).toBe("es");
  });

  it("falls back to English when nothing matches", () => {
    expect(detectLocale(["de-DE", "ja-JP"])).toBe("en");
  });

  it("falls back to English for an empty list", () => {
    expect(detectLocale([])).toBe("en");
  });

  it("is case-insensitive", () => {
    expect(detectLocale(["ES-es"])).toBe("es");
  });
});
