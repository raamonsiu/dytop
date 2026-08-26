import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/app";

/**
 * The wordmark, matching the D1ITO portfolio's header: pixel display face,
 * IPA transcription beside it, role underneath in wide-tracked caps.
 */
export function Brand() {
  const { t } = useTranslation();

  return (
    <Link to={ROUTES.radio} className="leading-tight">
      <span className="flex items-baseline gap-2">
        <span className="font-display text-xl tracking-wide text-foreground">
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
