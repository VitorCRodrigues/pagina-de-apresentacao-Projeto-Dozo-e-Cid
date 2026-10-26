import { http, HttpResponse } from "msw/http";

// Handlers follow the PRD section 8 contract. Scenarios (?scenario=...) arrive with the API layer.
export const handlers = [http.get("/api/v1/health", () => HttpResponse.json({ status: "ok" }))];
