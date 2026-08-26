import { useTranslation } from "react-i18next";

/** Placeholder. Phase 4 lists the real history off the queue store. */
export function HistoryView() {
  const { t } = useTranslation();

  return (
    <section className="h-full overflow-y-auto px-6 pb-6">
      <h1 className="text-xs uppercase tracking-widest text-muted-foreground">
        {t("history.title")}
      </h1>
      <p className="mt-6 text-sm text-muted-foreground">{t("history.empty")}</p>
    </section>
  );
}
