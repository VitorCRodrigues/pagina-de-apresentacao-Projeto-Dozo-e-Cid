import { CirclePlus, CircleUser, House, Layers, ListChecks, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { cx } from "@/lib/cx";
import { paths } from "@/routes";
import { Icon } from "./Icon";

const items: readonly {
  to: string;
  icon: LucideIcon;
  label: "home" | "deposit" | "portfolio" | "pending" | "profile";
}[] = [
  { to: paths.home, icon: House, label: "home" },
  { to: paths.deposit, icon: CirclePlus, label: "deposit" },
  { to: paths.portfolio, icon: Layers, label: "portfolio" },
  { to: paths.pending, icon: ListChecks, label: "pending" },
  { to: paths.profile, icon: CircleUser, label: "profile" },
];

// Labels always visible; the active tab gets navy text and a hairline on top, no pill.
// From lg up the same <nav> sits in the header, right-aligned, as text links: a tab bar is a
// phone pattern, not a desktop one. The hairline moves under the active link.
export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("nav.label")}
      className={cx(
        "fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-paper pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]",
        "lg:top-[env(safe-area-inset-top)] lg:bottom-auto lg:border-t-0 lg:bg-transparent lg:pb-0",
      )}
    >
      <ul className="mx-auto grid max-w-[480px] grid-cols-5 lg:flex lg:max-w-[880px] lg:justify-end lg:gap-8 lg:px-5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cx(
                  "type-caption relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 transition-colors duration-fast ease-od",
                  "lg:type-label lg:px-0",
                  isActive
                    ? "font-semibold text-navy-900 before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:bg-navy-900 lg:before:inset-x-0 lg:before:top-auto lg:before:bottom-0"
                    : "text-gray-600 hover:text-navy-900",
                )
              }
            >
              <Icon icon={item.icon} className="lg:hidden" />
              {t(`nav.${item.label}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
