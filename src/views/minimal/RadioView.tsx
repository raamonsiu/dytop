import { useTranslation } from "react-i18next";

/** Placeholder. Phase 4 brings the now-playing card, phase 5 the lyrics. */
export function RadioView() {
  const { t } = useTranslation();

  return (
    <section className="grid h-full place-items-center text-sm text-muted-foreground">
      {t("radio.nothingPlaying")}
    </section>
  );
}
