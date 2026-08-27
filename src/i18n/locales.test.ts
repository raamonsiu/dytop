import { describe, expect, it } from "vitest";
import ca from "./locales/ca.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

type Json = { [key: string]: string | Json };

/** Flattens to dotted paths so a diff points at the exact missing key. */
function keyPaths(value: Json, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string" ? [path] : keyPaths(child, path);
  });
}

const LOCALES = { en, es, ca } as unknown as Record<string, Json>;

/** i18next resolves these from a single source key by plural rule. */
const PLURAL_SUFFIX = /_(one|other|zero|two|few|many)$/;

function interpolationTokens(value: string): string[] {
  return [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] ?? "").sort();
}

function flatten(value: Json, prefix = ""): Record<string, string> {
  return Object.entries(value).reduce<Record<string, string>>((acc, [key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") acc[path] = child;
    else Object.assign(acc, flatten(child, path));
    return acc;
  }, {});
}

describe("locale files", () => {
  const reference = keyPaths(LOCALES.en as Json).sort();

  it.each(["es", "ca"])("%s defines exactly the same keys as en", (locale) => {
    // A missing key silently falls back to English at runtime, so nothing
    // breaks and nobody notices, which is why this is a test.
    expect(keyPaths(LOCALES[locale] as Json).sort()).toEqual(reference);
  });

  it.each(["en", "es", "ca"])("%s has no empty strings", (locale) => {
    const empty = Object.entries(flatten(LOCALES[locale] as Json))
      .filter(([, value]) => value.trim() === "")
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it.each(["es", "ca"])("%s uses the same interpolation tokens as en", (locale) => {
    const source = flatten(LOCALES.en as Json);
    const target = flatten(LOCALES[locale] as Json);

    for (const [key, value] of Object.entries(source)) {
      // A translation that drops {{count}} renders a sentence with a hole in it.
      expect(interpolationTokens(target[key] ?? "")).toEqual(
        interpolationTokens(value),
      );
    }
  });

  it("keeps plural variants complete", () => {
    // i18next needs every plural form of a key present, or it falls back to
    // the raw key for the missing count.
    for (const [locale, messages] of Object.entries(LOCALES)) {
      const paths = keyPaths(messages as Json);
      const pluralBases = new Set(
        paths.filter((path) => PLURAL_SUFFIX.test(path)).map((path) =>
          path.replace(PLURAL_SUFFIX, ""),
        ),
      );

      for (const base of pluralBases) {
        expect(paths, `${locale}: ${base}`).toContain(`${base}_one`);
        expect(paths, `${locale}: ${base}`).toContain(`${base}_other`);
      }
    }
  });
});
