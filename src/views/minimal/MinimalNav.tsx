import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { ViewToggle } from "@/components/ViewToggle";
import { ROUTES } from "@/constants/app";
import { cn } from "@/lib/cn";
import { Brand } from "./Brand";

const TAB_CLASSES =
  "text-xs uppercase tracking-widest transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      // `end` so "/" doesn't stay highlighted while on /history — every path
      // starts with "/", and NavLink matches by prefix otherwise.
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

export function MinimalNav() {
  const { t } = useTranslation();

  return (
    <header className="flex items-start justify-between gap-6 px-6 py-5">
      <Brand />
      <nav className="flex items-center gap-5">
        <Tab to={ROUTES.radio} label={t("nav.radio")} />
        <Tab to={ROUTES.history} label={t("nav.history")} />
        <span aria-hidden className="h-3 w-px bg-surface-border" />
        <ViewToggle current="minimal" />
      </nav>
    </header>
  );
}
