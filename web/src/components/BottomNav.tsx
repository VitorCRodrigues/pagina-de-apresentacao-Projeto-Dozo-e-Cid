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
export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-paper pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
    >
      <ul className="mx-auto grid max-w-[480px] grid-cols-5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cx(
                  "type-caption relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 transition-colors duration-fast ease-od",
                  isActive
                    ? "font-semibold text-navy-900 before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:bg-navy-900"
                    : "text-gray-600 hover:text-navy-900",
                )
              }
            >
              <Icon icon={item.icon} />
              {t(`nav.${item.label}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
