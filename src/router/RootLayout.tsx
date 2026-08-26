import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/app";
import { getPrefs } from "@/lib/prefs";
import { useDocumentLocale } from "@/lib/useDocumentLocale";
import { useZoomCompensation } from "@/lib/useZoomCompensation";
import { PlayerHost } from "@/player/PlayerHost";

/**
 * Module-scoped, not state: the restore must happen once per page load, not
 * once per mount. StrictMode mounts effects twice in development, and returning
 * to "/" from the legacy view later must not bounce the user straight back.
 */
let startupRestoreDone = false;

export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  useDocumentLocale();
  useZoomCompensation();

  useEffect(() => {
    if (startupRestoreDone) return;
    startupRestoreDone = true;

    // Only a bare "/" is treated as "no opinion". A deep link is an explicit
    // request and always wins over the remembered view.
    if (location.pathname === ROUTES.radio && getPrefs().lastView === "legacy") {
      void navigate(ROUTES.legacy, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first paint only
  }, []);

  return (
    <>
      <PlayerHost />
      <Outlet />
    </>
  );
}
