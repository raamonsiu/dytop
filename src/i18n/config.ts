import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ca from "./locales/ca.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

export const LOCALES = ["en", "es", "ca"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

function isSupported(value: string): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks a locale from the browser's preference list.
 *
 * Matches on the base language and ignores the region, so `es-AR`, `es-MX` and
 * `es-ES` all resolve to `es` — the app has no regional variants, and an exact
 * match would send most Spanish speakers to English.
 *
 * `navigator.languages` is ordered by preference, so the first supported entry
 * wins: a browser set to `[ca, es, en]` gets Catalan rather than whichever
 * language happens to be checked first.
 */
export function detectLocale(
  languages: readonly string[] = navigator.languages ?? [navigator.language],
): AppLocale {
  for (const tag of languages) {
    const base = tag.toLowerCase().split("-")[0];
    if (base && isSupported(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/**
 * All three locales are bundled rather than lazy-loaded. They're a couple of kB
 * each, and splitting them would trade that for a flash of untranslated UI.
 */
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    ca: { translation: ca },
  },
  lng: detectLocale(),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
});

export default i18n;
