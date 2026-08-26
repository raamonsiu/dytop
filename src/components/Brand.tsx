import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { VIEW_ROUTES } from "@/constants/app";
import { cn } from "@/lib/cn";
import type { ViewName } from "@/themes/tokens";

/**
 * The wordmark, matching the D1ITO portfolio's header: pixel display face,
 * IPA transcription beside it, role underneath in wide-tracked caps.
 *
 * Links to the current view's own radio route, so the logo never doubles as a
 * way out of the mode you're in.
 */
export function Brand({ view }: { view: ViewName }) {
  const { t } = useTranslation();

  return (
    <Link to={VIEW_ROUTES[view].radio} className="leading-tight">
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
        <span aria-hidden className="text-xs text-muted-foreground">
          /ˈdi.to/
        </span>
      </span>
      <span className="block text-xs uppercase tracking-widest text-muted-foreground">
        {t("app.role")}
      </span>
    </Link>
  );
}
