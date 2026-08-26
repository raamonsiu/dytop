import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label: string;
}

/**
 * Frosted dropdown used by the legacy navbar.
 *
 * Closes on Escape and on a click outside, which are the two things people try
 * before hunting for a close button.
 */
export function Panel({ open, onClose, children, className, label }: PanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    // pointerdown, not click: a click fires after the pointer is released, so
    // dragging a queue item and releasing outside would close the panel.
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !ref.current?.contains(target)) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className={cn(
        "absolute left-1/2 top-full z-50 mt-2 w-[min(92vw,26rem)] -translate-x-1/2",
        "rounded-view border border-glass-border bg-glass-strong p-4 shadow-2xl backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
