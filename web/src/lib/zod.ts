import { z } from "zod";

// Every schema imports z from here. The production CSP forbids eval (vite.config.ts); without
// jitless, Zod probes `new Function` before its first parse and, even though it catches the
// throw, the browser reports a CSP violation on every screen that validates. Zod's own docs name
// jitless for strict CSPs; the cost is its JIT shortcut for large objects, unused here.
z.config({ jitless: true });

export { z };
