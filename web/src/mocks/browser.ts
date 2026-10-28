import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { currentScenario } from "./scenario-state";

// Read ?scenario= now: the first API request may only happen after navigation drops the query.
currentScenario();

export const worker = setupWorker(...handlers);
