import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

interface CountdownProps {
  expiresAt: string;
  label: string;
  expiredText?: string;
  onExpire?: () => void;
  // Injectable clock for tests and stories.
  now?: () => number;
}

const WARNING_MS = 60_000;

function format(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}

// The visible timer is silent for screen readers (aria-live="off"); a separate polite region
// announces only the two moments that matter: the last minute and expiry.
export function Countdown({
  expiresAt,
  label,
  expiredText,
  onExpire,
  now = Date.now,
}: CountdownProps) {
  const { t } = useTranslation();
  const deadline = Date.parse(expiresAt);
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - now()));
  const expiredNotified = useRef(false);

  useEffect(() => {
    const tick = () => {
      setRemaining(Math.max(0, deadline - now()));
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [deadline, now]);

  const expired = remaining === 0;
  const warning = !expired && remaining <= WARNING_MS;

  useEffect(() => {
    if (expired && !expiredNotified.current) {
      expiredNotified.current = true;
      onExpire?.();
    }
  }, [expired, onExpire]);

  const expiredMessage = expiredText ?? t("countdown.expired");

  return (
    <div
      className={cx(
        "flex items-center gap-2 rounded-control px-3 py-2",
        expired && "bg-brick-50 text-brick-700",
        warning && "bg-amber-50 text-amber-700",
        !expired && !warning && "bg-gray-50 text-gray-600",
      )}
    >
      <Icon icon={Clock} size={16} className="shrink-0" />
      {expired ? (
        <span className="type-label">{expiredMessage}</span>
      ) : (
        <>
          <span className="type-caption flex-1">{label}</span>
          <span role="timer" aria-live="off" className="type-value text-graphite-900">
            {format(remaining)}
          </span>
        </>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {expired ? expiredMessage : warning ? t("countdown.lastMinute") : ""}
      </span>
    </div>
  );
}
