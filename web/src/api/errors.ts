import { apiErrorCodes, type ApiErrorBody, type ApiErrorCode } from "./proposed-types";

// "network": the request never got an answer. "invalid_response": the answer broke the contract.
export type ClientErrorCode = ApiErrorCode | "network" | "invalid_response";

interface ApiErrorInit {
  status: number;
  code: ClientErrorCode;
  message: string;
  fields?: Record<string, string>;
  until?: string;
}

// The UI translates errors by `code`; `message` is for logs only.
export class ApiError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;
  readonly fields: Record<string, string> | undefined;
  readonly until: string | undefined;

  constructor({ status, code, message, fields, until }: ApiErrorInit) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.until = until;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isApiErrorCode(code: string): code is ApiErrorCode {
  return (apiErrorCodes as readonly string[]).includes(code);
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((v) => typeof v === "string")
  );
}

// Hand-written guard (not Zod) so the production bundle can parse errors without Zod.
function readErrorBody(body: unknown): ApiErrorBody["error"] | null {
  if (typeof body !== "object" || body === null || !("error" in body)) return null;
  const { error } = body;
  if (typeof error !== "object" || error === null) return null;
  if (!("code" in error) || typeof error.code !== "string") return null;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const fields = "fields" in error && isRecordOfStrings(error.fields) ? error.fields : undefined;
  const until = "until" in error && typeof error.until === "string" ? error.until : undefined;
  return { code: error.code, message, ...(fields && { fields }), ...(until && { until }) };
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON (e.g. an HTML page from a proxy); handled as "internal" below.
  }

  const error = readErrorBody(body);
  if (!error) {
    return new ApiError({
      status: response.status,
      code: "internal",
      message: `HTTP ${String(response.status)}`,
    });
  }

  return new ApiError({
    status: response.status,
    code: isApiErrorCode(error.code) ? error.code : "internal",
    message: error.message,
    ...(error.fields && { fields: error.fields }),
    ...(error.until && { until: error.until }),
  });
}
