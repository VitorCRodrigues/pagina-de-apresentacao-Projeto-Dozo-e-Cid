import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/api/auth-context";
import { AppShell } from "@/components/AppShell";
import { SessionExpired } from "@/components/PageState";
import { paths } from "@/routes";

// Reached on inactivity timeout or a 401 from the API, which already ended the session. Arriving
// by any other way (a saved link) ends it too, once: signing in again from here must stick.
export function SessionExpiredScreen() {
  const navigate = useNavigate();
  const { status, login, expireSession } = useAuth();
  const statusOnArrival = useRef(status);

  useEffect(() => {
    if (statusOnArrival.current === "signedIn") expireSession();
  }, [expireSession]);

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
