import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { tabForPath, VIEW_ROUTES } from "@/constants/app";
import { cn } from "@/lib/cn";
import { setPref } from "@/lib/prefs";
import type { ViewName } from "@/themes/tokens";

interface ViewToggleProps {
  /** The view currently on screen; the control navigates to the other one. */
  current: ViewName;
  className?: string;
}

/**
 * Switches visual language. Records the choice so a cold start comes back to
 * the same place: see RootLayout's startup restore.
 *
 * Carries the active tab across: leaving `/legacy/radio` lands on `/radio`,
 * not always back on the player tab.
 */
export function ViewToggle({ current, className }: ViewToggleProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const target: ViewName = current === "minimal" ? "legacy" : "minimal";
  const label = t(target === "legacy" ? "nav.toLegacy" : "nav.toMinimal");
  const tab = tabForPath(current, location.pathname);

  return (
    <button
      type="button"
      onClick={() => {
        setPref("lastView", target);
        void navigate(VIEW_ROUTES[target][tab]);
      }}
      className={cn(
        "text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      {label}
    </button>
  );
}
