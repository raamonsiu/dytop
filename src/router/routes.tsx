import { createBrowserRouter, Navigate } from "react-router-dom";
import { ROUTES } from "@/constants/app";
import { LegacyHistoryView } from "@/views/legacy/LegacyHistoryView";
import { LegacyRadioView } from "@/views/legacy/LegacyRadioView";
import { LegacyShell } from "@/views/legacy/LegacyShell";
import { HistoryView } from "@/views/minimal/HistoryView";
import { MinimalShell } from "@/views/minimal/MinimalShell";
import { RadioView } from "@/views/minimal/RadioView";
import { RootLayout } from "./RootLayout";

/**
 * Two levels of nesting, both load-bearing:
 *
 * - RootLayout owns the player, so it must sit above every route.
 * - MinimalShell owns the minimal palette and nav, shared by radio and history,
 *   so those two are its children rather than siblings, otherwise the backdrop
 *   would remount (and the dither restart) on every tab switch.
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <MinimalShell />,
        children: [
          { path: ROUTES.radio, element: <RadioView /> },
          { path: ROUTES.history, element: <HistoryView /> },
        ],
      },
      {
        element: <LegacyShell />,
        children: [
          { path: ROUTES.legacy, element: <LegacyRadioView /> },
          { path: ROUTES.legacyHistory, element: <LegacyHistoryView /> },
        ],
      },
      { path: "*", element: <Navigate to={ROUTES.radio} replace /> },
    ],
  },
]);
