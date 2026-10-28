import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./auth-context";
import type { AuthClient, AuthSession } from "./auth";

interface AuthProviderProps {
  client: AuthClient;
  // Starts signed in; for tests and stories only.
  initialSession?: AuthSession;
  children: ReactNode;
}

// The access token lives only in memory (PRD section 9): never localStorage or sessionStorage.
// A reload signs the user out until the real provider brings silent refresh.
export function AuthProvider({ client, initialSession, children }: AuthProviderProps) {
  const token = useRef<string | null>(initialSession?.accessToken ?? null);
  const [status, setStatus] = useState<AuthStatus>(initialSession ? "signedIn" : "signedOut");

  const login = useCallback(async () => {
    setStatus("signingIn");
    try {
      const session = await client.login();
      token.current = session.accessToken;
      setStatus("signedIn");
    } catch (error) {
      setStatus("signedOut");
      throw error;
    }
  }, [client]);

  const logout = useCallback(async () => {
    token.current = null;
    setStatus("signedOut");
    await client.logout();
  }, [client]);

  const getAccessToken = useCallback(() => token.current, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, login, logout, getAccessToken }),
    [status, login, logout, getAccessToken],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
