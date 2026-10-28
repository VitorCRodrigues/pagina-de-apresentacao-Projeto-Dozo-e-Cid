import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/api/auth-context";
import { AppShell } from "@/components/AppShell";
import { SessionExpired } from "@/components/PageState";
import { paths } from "@/routes";

// Reached on inactivity timeout or a 401 from the API. Arriving here ends the session.
export function SessionExpiredScreen() {
  const navigate = useNavigate();
  const { status, login, logout } = useAuth();

  useEffect(() => {
    if (status === "signedIn") void logout();
  }, [status, logout]);

  async function signInAgain() {
    try {
      await login();
      void navigate(paths.home, { replace: true });
    } catch {
      void navigate(paths.entry, { replace: true });
    }
  }

  return (
    <AppShell>
      <SessionExpired onSignIn={() => void signInAgain()} />
    </AppShell>
  );
}
