// Generic OIDC contract. The app only knows login, logout and the access token.
// TODO(decisão): pick the real OIDC provider (PRD section 12) and implement it behind AuthClient.
// TODO(decisão): silent refresh before the access token expires (PRD section 9, security).

export interface AuthSession {
  accessToken: string;
}

export interface AuthClient {
  login: () => Promise<AuthSession>;
  logout: () => Promise<void>;
}

export function createMockAuthClient({ delayMs = 400 }: { delayMs?: number } = {}): AuthClient {
  return {
    login: () =>
      new Promise((resolve) => {
        window.setTimeout(() => {
          resolve({ accessToken: `mock-${crypto.randomUUID()}` });
        }, delayMs);
      }),
    logout: () => Promise.resolve(),
  };
}
