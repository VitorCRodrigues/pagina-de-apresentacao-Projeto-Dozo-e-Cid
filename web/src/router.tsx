import { createBrowserRouter } from "react-router";

export const routes = [
  {
    path: "/",
    lazy: async () => {
      const { I18nDemoPage } = await import("@/I18nDemoPage");
      return { Component: I18nDemoPage };
    },
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
