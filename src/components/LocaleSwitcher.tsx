import { useTranslation } from "react-i18next";
import { LOCALE_LABELS, LOCALES } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { setPref, usePref, type AppLocale } from "@/lib/prefs";

/**
 * Three locales is few enough that a row of buttons beats a select: no popup,
 * and the current language is visible without interacting.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const locale = usePref("locale");

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={cn("flex items-center gap-2", className)}
    >
      {LOCALES.map((code: AppLocale) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-current={code === locale}
          title={LOCALE_LABELS[code]}
          onClick={() => {
            setPref("locale", code);
            void i18n.changeLanguage(code);
          }}
          className={cn(
            "text-xs uppercase tracking-widest transition-colors",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            code === locale
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
