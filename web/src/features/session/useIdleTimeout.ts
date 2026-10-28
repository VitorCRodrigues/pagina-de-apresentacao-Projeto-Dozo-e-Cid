import { useCallback, useEffect, useRef, useState } from "react";

export const SESSION_TIMEOUT_MS = 15 * 60_000;
export const SESSION_WARNING_MS = 60_000;

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

interface IdleTimeoutOptions {
  timeoutMs: number;
  warningMs: number;
  onTimeout: () => void;
}

interface IdleTimeout {
  // Epoch ms when the session ends; null while the client is active.
  deadline: number | null;
  stayActive: () => void;
}

// Inactivity timer (PRD section 9). Once the warning shows, ambient activity no longer counts:
// only an explicit stayActive() keeps the session, so a stray scroll cannot hide the dialog.
export function useIdleTimeout({
  timeoutMs,
  warningMs,
  onTimeout,
}: IdleTimeoutOptions): IdleTimeout {
  const lastActivity = useRef(0);
  const warned = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  const [deadline, setDeadline] = useState<number | null>(null);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    lastActivity.current = Date.now();
    warned.current = false;
    let finished = false;

    const markActive = () => {
      if (!warned.current) lastActivity.current = Date.now();
    };

    const check = () => {
      if (finished) return;
      const idle = Date.now() - lastActivity.current;
      if (idle >= timeoutMs) {
        finished = true;
        onTimeoutRef.current();
      } else if (idle >= timeoutMs - warningMs && !warned.current) {
        warned.current = true;
        setDeadline(lastActivity.current + timeoutMs);
      }
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true, capture: true });
    }
    // Timers are throttled in background tabs: check as soon as the tab comes back.
    document.addEventListener("visibilitychange", check);
    const interval = window.setInterval(check, 1000);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive, { capture: true });
      }
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(interval);
    };
  }, [timeoutMs, warningMs]);

  const stayActive = useCallback(() => {
    lastActivity.current = Date.now();
    warned.current = false;
    setDeadline(null);
  }, []);

  return { deadline, stayActive };
}
