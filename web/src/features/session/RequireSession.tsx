import { type ComponentType, lazy, Suspense } from "react";
import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/api/auth-context";
import { isApiError } from "@/api/errors";
import { useConfig } from "@/api/hooks/config";
import { useMe } from "@/api/hooks/account";
import { AppShell } from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/PageState";
import { reportIssue } from "@/lib/report";
import { paths } from "@/routes";
import { hasOpenedAccount, landingPathFor } from "./account-routing";
import { useAccountLocale } from "./useAccountLocale";

// The waitlist form (React Hook Form + Zod) loads only for clients outside the live markets.
const NotAvailableScreen = lazy(async () => ({
  default: (await import("./NotAvailableScreen")).NotAvailableScreen,
}));

// The inactivity warning is a dialog (Radix Dialog, scroll lock, focus trap): only signed-in
// screens need it, so it stays out of the entry screen's download.
// If its chunk cannot load (a deploy replaced it, the network dropped), the screens stay and only
// the warning is missing; the server still ends an expired token. Monitoring hears of it.
const SessionTimeout = lazy(async (): Promise<{ default: ComponentType }> => {
  try {
    return { default: (await import("./SessionTimeout")).SessionTimeout };
  } catch {
    reportIssue("session_timeout_unavailable");
    return { default: () => null };
  }
});

// Signed in, profile loaded, country live. Everything behind it can rely on useMe().data.
export function RequireSession() {
  const { status } = useAuth();
  if (status === "expired") return <Navigate to={paths.sessionExpired} replace />;
  if (status !== "signedIn") return <Navigate to={paths.entry} replace />;
  return <SessionGate />;
}

function SessionGate() {
  const me = useMe();
  const config = useConfig();
  const error = me.error ?? config.error;
  useAccountLocale(me.data?.locale);

  if (error) {
    if (isApiError(error) && error.code === "session_expired") {
      return <Navigate to={paths.sessionExpired} replace />;
    }
    if (isApiError(error) && error.code === "maintenance") {
      return <Navigate to={paths.maintenance} replace state={{ until: error.until }} />;
    }
    return (
      <AppShell>
        <ErrorState
          page
          onRetry={() => {
            void me.refetch();
            void config.refetch();
          }}
        />
      </AppShell>
    );
  }

  if (!me.data || !config.data) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (!config.data.liveMarkets.includes(me.data.country)) {
    return (
      <AppShell>
        <Suspense fallback={<LoadingState />}>
          <NotAvailableScreen me={me.data} />
        </Suspense>
      </AppShell>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <SessionTimeout />
      </Suspense>
      <Outlet />
    </>
  );
}

// Before "open": onboarding and account status only, no bottom navigation.
export function PreOpenLayout() {
  const { data: me } = useMe();
  if (me && hasOpenedAccount(me.accountStatus)) return <Navigate to={paths.home} replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

// T3 lives here for every status: without navigation before the account opens, with it after
// (a restricted account keeps the navigation; decisions.md, item 14).
export function AccountStatusLayout() {
  const { data: me } = useMe();
  return (
    <AppShell nav={me ? hasOpenedAccount(me.accountStatus) : false}>
      <Outlet />
    </AppShell>
  );
}

// Route guard: deposit, portfolio and the rest of the app need an opened account.
export function RequireOpenAccount() {
  const { data: me } = useMe();
  if (me && !hasOpenedAccount(me.accountStatus)) {
    return <Navigate to={landingPathFor(me.accountStatus)} replace />;
  }
  return (
    <AppShell nav>
      <Outlet />
    </AppShell>
  );
}
