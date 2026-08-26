import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getPrefs, type AppLocale } from "@/lib/prefs";
import ca from "./locales/ca.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

export const LOCALES = ["en", "es", "ca"] as const;

/** Native names, so the switcher reads in the language it offers. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  ca: "Català",
};

/**
 * All three locales are bundled rather than lazy-loaded. They're a couple of kB
 * each, and code-splitting them would mean a flash of untranslated UI on every
 * language switch for no meaningful saving.
 */
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    ca: { translation: ca },
  },
  lng: getPrefs().locale,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
