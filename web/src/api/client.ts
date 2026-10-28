import { ApiError, toApiError } from "./errors";
import type { ResponseName, ResponseTypes } from "./response-types";
import type { Locale } from "./types";

export const API_BASE = "/api/v1";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface BaseOptions {
  body?: unknown;
  // Multipart upload; the browser sets the boundary, so no Content-Type is forced.
  formData?: FormData;
  // Undefined values are left out of the URL.
  query?: Record<string, string | undefined>;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

function withQuery(path: string, query: BaseOptions["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, value);
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export interface ApiClient {
  // With `response`, resolves to that body type (validated in dev); without it, to undefined.
  request<K extends ResponseName>(
    method: HttpMethod,
    path: string,
    options: BaseOptions & { response: K },
  ): Promise<ResponseTypes[K]>;
  request(method: HttpMethod, path: string, options?: BaseOptions): Promise<undefined>;
}

interface ClientOptions {
  getToken: () => string | null;
  getLocale: () => Locale;
  fetch?: typeof fetch;
  // Validate responses against the Zod schemas: on in development and tests, off in production,
  // where schemas.ts (and Zod) is never loaded.
  validate?: boolean;
}

async function validated(
  name: ResponseName,
  data: unknown,
  method: HttpMethod,
  path: string,
  status: number,
): Promise<unknown> {
  const { responseSchemas } = await import("./schemas");
  const parsed = responseSchemas[name].safeParse(data);
  if (parsed.success) return parsed.data;
  // Paths only, never values: responses carry personal data.
  console.error("[api] response broke the contract", {
    method,
    path,
    fields: parsed.error.issues.map((issue) => issue.path.join(".")),
  });
  throw new ApiError({ status, code: "invalid_response", message: `Invalid response for ${path}` });
}

export function createApiClient({
  getToken,
  getLocale,
  fetch: fetchImpl,
  validate = import.meta.env.DEV || import.meta.env.MODE === "test",
}: ClientOptions): ApiClient {
  async function request(
    method: HttpMethod,
    path: string,
    options: BaseOptions & { response?: ResponseName } = {},
  ): Promise<unknown> {
    const headers = new Headers({ Accept: "application/json", "Accept-Language": getLocale() });
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
    if (options.body !== undefined) headers.set("Content-Type", "application/json");

    let response: Response;
    try {
      // Resolved per call, so test and mock layers that patch fetch are picked up.
      response = await (fetchImpl ?? fetch)(`${API_BASE}${withQuery(path, options.query)}`, {
        method,
        headers,
        ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
        ...(options.formData && { body: options.formData }),
        ...(options.signal && { signal: options.signal }),
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
      throw new ApiError({ status: 0, code: "network", message: "Network request failed" });
    }

    if (!response.ok) throw await toApiError(response);
    if (response.status === 204 || !options.response) return undefined;

    const data: unknown = await response.json();
    return validate ? validated(options.response, data, method, path, response.status) : data;
  }

  return { request } as ApiClient;
}
