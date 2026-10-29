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
  // Multipart POST with upload progress (fetch cannot report it). `onProgress` gets 0–1.
  upload<K extends ResponseName>(
    path: string,
    formData: FormData,
    options: { response: K; onProgress?: (fraction: number) => void },
  ): Promise<ResponseTypes[K] | undefined>;
}

interface ClientOptions {
  getToken: () => string | null;
  getLocale: () => Locale;
  fetch?: typeof fetch;
  // XMLHttpRequest factory for upload(); tests replay progress events with a fake.
  xhr?: () => XMLHttpRequest;
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
  xhr: createXhr = () => new XMLHttpRequest(),
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

  function upload(
    path: string,
    formData: FormData,
    { response, onProgress }: { response: ResponseName; onProgress?: (fraction: number) => void },
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const xhr = createXhr();
      xhr.open("POST", `${API_BASE}${path}`);
      // Same headers as request(); the browser sets the multipart Content-Type with its boundary.
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Accept-Language", getLocale());
      const token = getToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
      };
      xhr.onerror = () => {
        reject(new ApiError({ status: 0, code: "network", message: "Network request failed" }));
      };
      xhr.onload = () => {
        const settle = async () => {
          // An empty success answers undefined, like request() does for 204.
          if (xhr.status >= 200 && xhr.status < 300 && !xhr.responseText) return undefined;
          // Reuses the fetch path for errors and validation by wrapping the reply in a Response.
          const reply = new Response(xhr.responseText, {
            status: xhr.status,
            headers: { "Content-Type": xhr.getResponseHeader("Content-Type") ?? "" },
          });
          if (!reply.ok) throw await toApiError(reply);
          const data: unknown = await reply.json();
          return validate ? validated(response, data, "POST", path, reply.status) : data;
        };
        settle().then(resolve, reject);
      };
      xhr.send(formData);
    });
  }

  return { request, upload } as ApiClient;
}
