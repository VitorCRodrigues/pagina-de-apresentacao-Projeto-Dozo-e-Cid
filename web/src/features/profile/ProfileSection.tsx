import { ChevronRight } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Link } from "react-router";
import { Icon } from "@/components/Icon";

// A titled block of the index: heading, then its lines between hairlines, as on Home and Aportar.
export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="type-heading text-navy-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export const sectionBlock = "flex flex-col gap-3 border-y border-gray-200 py-4";

// One line of the index that opens another screen. Use inside a <ul> with hairlines.
export function ProfileRow({
  to,
  label,
  detail,
}: {
  to: string;
  label: string;
  detail?: string | undefined;
}) {
  return (
    <li className="border-t border-gray-200 first:border-t-0">
      <Link to={to} className="flex min-h-12 items-center gap-3 py-3 hover:bg-paper">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="type-body text-graphite-900">{label}</span>
          {detail && <span className="type-caption text-gray-600 tabular-nums">{detail}</span>}
        </span>
        <Icon icon={ChevronRight} size={16} className="shrink-0 text-gray-600" />
      </Link>
    </li>
  );
}
