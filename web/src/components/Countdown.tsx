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
    // A statement line with a side rule, like Banner: the last minute and expiry change only
    // the colour of the text and the rule.
    <div
      className={cx(
        "flex items-center gap-2 border-l-2 py-1 pl-3 transition-colors duration-base ease-od",
        expired && "border-brick-700 text-brick-700",
        warning && "border-amber-700 text-amber-700",
        !expired && !warning && "border-gray-200 text-gray-600",
      )}
    >
      <Icon icon={Clock} size={16} className="shrink-0" />
      {expired ? (
        <span className="type-label">{expiredMessage}</span>
      ) : (
        <>
          <span className="type-caption flex-1">{label}</span>
          <span
            role="timer"
            aria-live="off"
            className={cx("type-value", !warning && "text-graphite-900")}
          >
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
