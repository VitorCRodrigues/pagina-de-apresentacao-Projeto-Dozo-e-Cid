import { createContext, useContext } from "react";

// "expired": the API refused the token (401). Like signed out, but the guard says why.
export type AuthStatus = "signedOut" | "signingIn" | "signedIn" | "expired";

export interface AuthContextValue {
  status: AuthStatus;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  expireSession: () => void;
  getAccessToken: () => string | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
