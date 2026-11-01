import type { i18n as I18n } from "i18next";
import i18n, { type Namespace } from "./index";

// Called from a route's lazy() before its screen renders, so the screen never shows raw keys.
// A later language change reloads every namespace already in use (i18next does it).
export function loadNamespace(
  namespace: Namespace | readonly Namespace[],
  instance: I18n = i18n,
): Promise<void> {
  return instance.loadNamespaces(namespace);
}
