import { createBrowserRouter } from "react-router";
import { RouteFallback } from "@/components/RouteFallback";

export const routes = [
  {
    path: "/",
    HydrateFallback: RouteFallback,
    lazy: async () => {
      const { I18nDemoPage } = await import("@/I18nDemoPage");
      return { Component: I18nDemoPage };
    },
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
