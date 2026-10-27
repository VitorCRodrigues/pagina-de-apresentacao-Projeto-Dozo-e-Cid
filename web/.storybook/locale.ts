import type { Locale } from "@/api/types";

// Reads the toolbar locale inside a story's render function.
export function storyLocale(globals: Record<string, unknown>): Locale {
  const value = globals.locale;
  return value === "pt" || value === "en" ? value : "es";
}
