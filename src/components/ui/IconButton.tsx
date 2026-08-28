import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const ICON_BUTTON_CLASSES =
  // pointer-coarse grows the hit area to Apple/Android's ~44px touch-target
  // floor without changing how the button looks with a mouse.
  "inline-grid size-9 place-items-center rounded-view border border-surface-border " +
  "pointer-coarse:size-11 " +
  "text-foreground transition-colors hover:border-accent hover:text-accent " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:cursor-not-allowed disabled:opacity-40";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: these buttons never have a text label, so without it the
   * transport controls are unusable with a screen reader. */
  "aria-label": string;
}

export function IconButton({ className, ...props }: IconButtonProps) {
  return (
    <button type="button" className={cn(ICON_BUTTON_CLASSES, className)} {...props} />
  );
}
