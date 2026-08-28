import { Brand } from "@/components/Brand";
import { NavTabs } from "@/components/NavTabs";
import { ViewToggle } from "@/components/ViewToggle";
import { safeAreaOffset } from "@/lib/safeArea";

export function MinimalNav() {
  return (
    <header
      className="flex items-start justify-between gap-6 px-6 py-5"
      // Clears a notch/dynamic island without adding a gap on ordinary
      // screens; viewport-fit=cover means the page draws under it otherwise.
      style={{ paddingTop: safeAreaOffset("top", 1.25) }}
    >
      <Brand view="minimal" />
      <nav className="flex items-center gap-5">
        <NavTabs view="minimal" />
        <span aria-hidden className="h-3 w-px bg-surface-border" />
        <ViewToggle current="minimal" />
      </nav>
    </header>
  );
}
