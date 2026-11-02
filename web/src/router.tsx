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

// Area screens: their texts (i18n namespace) and their chunk load in parallel, not one after
// the other, so the first visit costs a single round trip.
function area<M extends Record<string, unknown>>(
  namespace: Namespace | readonly Namespace[],
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
              {
                path: "inicio",
                // Deposit states are named in the deposit texts.
                lazy: area(
                  ["portfolio", "deposit"],
                  () => import("@/features/home/HomeScreen"),
                  "HomeScreen",
                ),
              },
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
              {
                path: "cartera",
                lazy: area(
                  "portfolio",
                  () => import("@/features/portfolio/PortfolioScreen"),
                  "PortfolioScreen",
                ),
              },
              {
                path: "pendientes",
                // DocumentUpload reads the account texts; deposit states, the deposit ones.
                lazy: area(
                  ["pending", "account", "deposit"],
                  () => import("@/features/pending/PendingScreen"),
                  "PendingScreen",
                ),
              },
              {
                path: "perfil",
                lazy: area(
                  "profile",
                  () => import("@/features/profile/ProfileScreen"),
                  "ProfileScreen",
                ),
              },
              {
                path: "perfil/ayuda",
                lazy: area("profile", () => import("@/features/help/HelpScreen"), "HelpScreen"),
              },
              {
                path: "perfil/inversor",
                // The questions read the onboarding texts.
                lazy: area(
                  ["profile", "onboarding"],
                  () => import("@/features/profile/SuitabilityScreen"),
                  "SuitabilityScreen",
                ),
              },
              {
                path: "plan",
                // Rail names and the amount field read the deposit texts.
                lazy: area(
                  ["plan", "deposit"],
                  () => import("@/features/plans/PlanScreen"),
                  "PlanScreen",
                ),
              },
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
