import { createBrowserRouter, Outlet, type RouteObject } from "react-router";
import { RouteFallback } from "@/components/RouteFallback";
import {
  AccountStatusLayout,
  PreOpenLayout,
  RequireOpenAccount,
  RequireSession,
} from "@/features/session/RequireSession";

// Guards and layouts load eagerly; screens load per route.
const placeholder = (name: keyof typeof import("@/features/placeholders")) => async () => {
  const screens = await import("@/features/placeholders");
  return { Component: screens[name] };
};

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Outlet />,
    HydrateFallback: RouteFallback,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import("@/features/session/EntryScreen")).EntryScreen,
        }),
      },
      {
        path: "sesion-expirada",
        lazy: async () => ({
          Component: (await import("@/features/session/SessionExpiredScreen")).SessionExpiredScreen,
        }),
      },
      {
        path: "mantenimiento",
        lazy: async () => ({
          Component: (await import("@/features/system/MaintenanceScreen")).MaintenanceScreen,
        }),
      },
      {
        element: <RequireSession />,
        children: [
          {
            element: <PreOpenLayout />,
            children: [
              {
                path: "onboarding",
                lazy: async () => ({
                  Component: (await import("@/features/onboarding/OnboardingLayout"))
                    .OnboardingLayout,
                }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import("@/features/onboarding/OnboardingLayout"))
                        .OnboardingResume,
                    }),
                  },
                  {
                    path: ":slug",
                    lazy: async () => ({
                      Component: (await import("@/features/onboarding/OnboardingLayout"))
                        .OnboardingStepRoute,
                    }),
                  },
                ],
              },
            ],
          },
          {
            element: <AccountStatusLayout />,
            children: [
              {
                path: "cuenta",
                lazy: async () => ({
                  Component: (await import("@/features/account/AccountStatusScreen"))
                    .AccountStatusScreen,
                }),
              },
            ],
          },
          {
            element: <RequireOpenAccount />,
            children: [
              { path: "inicio", lazy: placeholder("HomeScreen") },
              { path: "aportar", lazy: placeholder("DepositScreen") },
              { path: "cartera", lazy: placeholder("PortfolioScreen") },
              { path: "pendientes", lazy: placeholder("PendingScreen") },
              { path: "perfil", lazy: placeholder("ProfileScreen") },
              { path: "plan", lazy: placeholder("PlanScreen") },
            ],
          },
        ],
      },
      {
        path: "*",
        lazy: async () => ({
          Component: (await import("@/features/system/NotFoundScreen")).NotFoundScreen,
        }),
      },
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
