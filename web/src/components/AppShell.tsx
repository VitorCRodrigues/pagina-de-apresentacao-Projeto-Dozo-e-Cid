import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";
import { BottomNav } from "./BottomNav";
import { Wordmark } from "./Wordmark";

interface AppShellProps {
  // Bottom navigation exists only once the account is open (PRD section 7).
  nav?: boolean;
  children: ReactNode;
}

// Quiet one-line header, a 480 px column centred on desktop, iPhone safe areas on every edge.
export function AppShell({ nav = false, children }: AppShellProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <a
        href="#main"
        className="type-label sr-only rounded-control bg-navy-900 px-4 py-2 text-cream-50 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {t("shell.skipToContent")}
      </a>
      <header className="border-b border-gray-200 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-[480px] items-center px-5">
          <Wordmark />
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className={cx(
          "mx-auto w-full max-w-[480px] flex-1 px-5 pt-6 outline-none",
          nav
            ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>
      {nav && <BottomNav />}
    </div>
  );
}
