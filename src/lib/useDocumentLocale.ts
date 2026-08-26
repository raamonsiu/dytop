import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Keeps `<html lang>` in step with the active locale.
 *
 * index.html ships a static `lang="es"`, which is wrong for two of the three
 * languages. Screen readers take pronunciation from this attribute, so a stale
 * value makes Catalan read out with Spanish phonetics.
 */
export function useDocumentLocale(): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
}
