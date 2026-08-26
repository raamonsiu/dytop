import { useEffect } from "react";
import { usePref } from "./prefs";

/**
 * Keeps `<html lang>` in step with the chosen locale.
 *
 * index.html ships a static `lang="es"`, which would then be a lie for the
 * other two. Screen readers pick pronunciation from this attribute, so a stale
 * value makes Catalan read out with Spanish phonetics.
 */
export function useDocumentLocale(): void {
  const locale = usePref("locale");

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
}
