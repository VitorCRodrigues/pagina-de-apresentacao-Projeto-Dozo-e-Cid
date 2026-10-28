import { createContext, useContext } from "react";

export type AuthStatus = "signedOut" | "signingIn" | "signedIn";

export interface AuthContextValue {
  status: AuthStatus;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
