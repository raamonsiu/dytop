import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { VIEW_ROUTES } from "@/constants/app";
import { cn } from "@/lib/cn";
import type { ViewName } from "@/themes/tokens";

const TAB_CLASSES =
  "text-xs uppercase tracking-widest transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Player, radio and history tabs, pointed at the current view's own routes. */
export function NavTabs({ view }: { view: ViewName }) {
  const { t } = useTranslation();
  const routes = VIEW_ROUTES[view];

  return (
    <>
      <Tab to={routes.player} label={t("nav.player")} />
      <Tab to={routes.radio} label={t("nav.radio")} />
      <Tab to={routes.history} label={t("nav.history")} />
    </>
  );
}

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      // `end` so "/" and "/legacy" don't stay highlighted while on their
      // history child: NavLink matches by prefix otherwise.
      end
      className={({ isActive }) =>
        cn(
          TAB_CLASSES,
          isActive ? "text-accent" : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      {label}
    </NavLink>
  );
}
