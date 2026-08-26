import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "ghost";

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-accent-foreground hover:opacity-90",
  ghost:
    "border-surface-border bg-surface text-foreground hover:border-accent hover:text-accent",
};

export const BUTTON_BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-view border px-4 py-2 text-sm transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:cursor-not-allowed disabled:opacity-40";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "ghost", className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(BUTTON_BASE_CLASSES, BUTTON_VARIANT_CLASSES[variant], className)}
      {...props}
    />
  );
}
