import type { ComponentType } from "react";
import { createBrowserRouter, Outlet, type RouteObject } from "react-router";
import { RouteFallback } from "@/components/RouteFallback";
import type { Namespace } from "@/i18n";
import { loadNamespace } from "@/i18n/load-namespace";
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

// Area screens: their texts (i18n namespace) and their chunk load in parallel, not one after
// the other, so the first visit costs a single round trip.
function area<M extends Record<string, unknown>>(
  namespace: Namespace,
  load: () => Promise<M>,
  name: keyof M,
) {
  return async () => {
    const [module] = await Promise.all([load(), loadNamespace(namespace)]);
    return { Component: module[name] as ComponentType };
  };
}

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
                lazy: area(
                  "onboarding",
                  () => import("@/features/onboarding/OnboardingLayout"),
                  "OnboardingLayout",
                ),
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
                lazy: area(
                  "account",
                  () => import("@/features/account/AccountStatusScreen"),
                  "AccountStatusScreen",
                ),
              },
            ],
          },
          {
            element: <RequireOpenAccount />,
            children: [
              { path: "inicio", lazy: placeholder("HomeScreen") },
              {
                path: "aportar",
                lazy: area(
                  "deposit",
                  () => import("@/features/deposits/DepositsHome"),
                  "DepositsHome",
                ),
              },
              {
                path: "aportar/nuevo",
                lazy: area(
                  "deposit",
                  () => import("@/features/deposits/NewDepositScreen"),
                  "NewDepositScreen",
                ),
              },
              {
                path: "aportar/:id",
                lazy: area(
                  "deposit",
                  () => import("@/features/deposits/DepositDetailScreen"),
                  "DepositDetailScreen",
                ),
              },
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
