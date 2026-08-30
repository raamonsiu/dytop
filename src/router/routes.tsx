import { createBrowserRouter, Navigate } from "react-router-dom";
import { ROUTES } from "@/constants/app";
import { LegacyHistoryView } from "@/views/legacy/LegacyHistoryView";
import { LegacyPlayerView } from "@/views/legacy/LegacyPlayerView";
import { LegacyRadioView } from "@/views/legacy/LegacyRadioView";
import { LegacyShell } from "@/views/legacy/LegacyShell";
import { HistoryView } from "@/views/minimal/HistoryView";
import { MinimalShell } from "@/views/minimal/MinimalShell";
import { PlayerView } from "@/views/minimal/PlayerView";
import { RadioView } from "@/views/minimal/RadioView";
import { RootLayout } from "./RootLayout";

/**
 * Two levels of nesting, both load-bearing:
 *
 * - RootLayout owns the player, so it must sit above every route.
 * - MinimalShell owns the minimal palette and nav, shared by player and history,
 *   so those two are its children rather than siblings, otherwise the backdrop
 *   would remount (and the dither restart) on every tab switch.
 *
 * The radio routes are flat Outlet children alongside player/history, exactly
 * like history: they swap only the innermost view. The shared PlayerHost stays
 * mounted in RootLayout above the Outlet, so the single YouTube iframe is never
 * reparented or remounted when switching to live radio.
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <MinimalShell />,
        children: [
          { path: ROUTES.player, element: <PlayerView /> },
          { path: ROUTES.liveRadio, element: <RadioView /> },
          { path: ROUTES.history, element: <HistoryView /> },
        ],
      },
      {
        element: <LegacyShell />,
        children: [
          { path: ROUTES.legacy, element: <LegacyPlayerView /> },
          { path: ROUTES.legacyRadio, element: <LegacyRadioView /> },
          { path: ROUTES.legacyHistory, element: <LegacyHistoryView /> },
        ],
      },
      { path: "*", element: <Navigate to={ROUTES.player} replace /> },
    ],
  },
]);
