import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Conditional classes with later Tailwind utilities winning over earlier ones,
 * so a `className` prop can always override a component's defaults. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
