import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { ViewName } from "@/themes/tokens";

/**
 * The wordmark, matching the D1ITO portfolio's header: pixel display face,
 * IPA transcription beside it, role underneath in wide-tracked caps.
 *
 * Links out to the main D1ITO portfolio site, same as that site's own header.
 */
export function Brand({ view }: { view: ViewName }) {
  const { t } = useTranslation();

  return (
    <a href="https://d1ito.dev" className="leading-tight">
      <span className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-xl tracking-wide text-foreground",
            // Legacy keeps its rounded face here too, so the header reads as
            // part of that view rather than a piece of the other one.
            view === "legacy" ? "font-blobby" : "font-display",
          )}
        >
          D1ITO
        </span>
        {/* The IPA gloss and the role line beneath are the first things a
            cramped screen can afford to lose: cut before anything functional
            has to. */}
        <span aria-hidden className="hidden text-xs text-muted-foreground sm:inline">
          /ˈdi.to/
        </span>
      </span>
      <span className="hidden text-xs uppercase tracking-widest text-muted-foreground sm:block">
        {t("app.role")}
      </span>
    </a>
  );
}
