import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { lucia } from "@/mocks/fixtures";
import { server } from "@/mocks/node";
import { createApiClient } from "./client";
import { ApiError } from "./errors";

const client = (token: string | null = "t-1") =>
  createApiClient({ getToken: () => token, getLocale: () => "pt", validate: true });

describe("api client", () => {
  it("sends bearer, Accept-Language and Idempotency-Key under /api/v1", async () => {
    let seen: Headers | undefined;
    server.use(
      http.post("/api/v1/ping", ({ request }) => {
        seen = request.headers;
        return HttpResponse.json(lucia);
      }),
    );

    await expect(
      client().request("POST", "/ping", { response: "me", body: {}, idempotencyKey: "k-1" }),
    ).resolves.toEqual(lucia);
    expect(seen?.get("Authorization")).toBe("Bearer t-1");
    expect(seen?.get("Accept-Language")).toBe("pt");
    expect(seen?.get("Idempotency-Key")).toBe("k-1");
    expect(seen?.get("Content-Type")).toBe("application/json");
  });

  it("omits Authorization without a token", async () => {
    let auth: string | null = "unset";
    server.use(
      http.get("/api/v1/ping", ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json(lucia);
      }),
    );
    await client(null).request("GET", "/ping", { response: "me" });
    expect(auth).toBeNull();
  });

  it("adds query parameters and skips undefined ones", async () => {
    let url: URL | undefined;
    server.use(
      http.get("/api/v1/ping", ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json(lucia);
      }),
    );
    await client().request("GET", "/ping", {
      response: "me",
      query: { state: "invested", cursor: undefined, limit: "20" },
    });
    expect(url?.searchParams.get("state")).toBe("invested");
    expect(url?.searchParams.get("limit")).toBe("20");
    expect(url?.searchParams.has("cursor")).toBe(false);
  });

  // jsdom's FormData cannot travel through Node's fetch, so this one inspects the fetch call.
  it("sends multipart as the body without forcing a content type", async () => {
    const fetchSpy = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
    const formData = new FormData();
    formData.set("file", new File(["%PDF"], "dni.pdf", { type: "application/pdf" }));

    await createApiClient({
      getToken: () => "t-1",
      getLocale: () => "es",
      fetch: fetchSpy,
    }).request("POST", "/account/documents", { formData });

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("/api/v1/account/documents");
    expect(init?.body).toBe(formData);
    expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
  });

  it("returns undefined for 204", async () => {
    server.use(http.post("/api/v1/ping", () => new HttpResponse(null, { status: 204 })));
    await expect(client().request("POST", "/ping", { body: {} })).resolves.toBeUndefined();
  });

  it("turns an error body into ApiError with code, status, fields and until", async () => {
    server.use(
      http.get("/api/v1/ping", () =>
        HttpResponse.json(
          {
            error: {
              code: "maintenance",
              message: "down",
              fields: { quoteId: "stale" },
              until: "2026-10-28T21:00:00Z",
            },
          },
          { status: 503 },
        ),
      ),
    );
    const error = await client()
      .request("GET", "/ping")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 503,
      code: "maintenance",
      fields: { quoteId: "stale" },
      until: "2026-10-28T21:00:00Z",
    });
  });

  it("reads a non-JSON error page as internal, keeping the status", async () => {
    server.use(
      http.get("/api/v1/ping", () => new HttpResponse("<html>Bad gateway</html>", { status: 502 })),
    );
    await expect(client().request("GET", "/ping")).rejects.toMatchObject({
      status: 502,
      code: "internal",
    });
  });

  it("reads an unknown error code as internal", async () => {
    server.use(
      http.get("/api/v1/ping", () =>
        HttpResponse.json({ error: { code: "teapot", message: "?" } }, { status: 418 }),
      ),
    );
    await expect(client().request("GET", "/ping")).rejects.toMatchObject({ code: "internal" });
  });

  it("reports a failed request as network", async () => {
    server.use(http.get("/api/v1/ping", () => HttpResponse.error()));
    await expect(client().request("GET", "/ping")).rejects.toMatchObject({
      status: 0,
      code: "network",
    });
  });

  it("rejects a response that breaks the schema, logging paths but not values", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    server.use(
      http.get("/api/v1/ping", () =>
        HttpResponse.json({ ...lucia, accountStatus: "approved", email: 42 }),
      ),
    );

    await expect(client().request("GET", "/ping", { response: "me" })).rejects.toMatchObject({
      code: "invalid_response",
    });
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("accountStatus");
    expect(logged).not.toContain("approved");
    expect(logged).not.toContain(lucia.name);
  });

  it("passes responses through when validation is off", async () => {
    server.use(http.get("/api/v1/ping", () => HttpResponse.json({ unexpected: true })));
    const lenient = createApiClient({
      getToken: () => null,
      getLocale: () => "es",
      validate: false,
    });
    await expect(lenient.request("GET", "/ping", { response: "me" })).resolves.toEqual({
      unexpected: true,
    });
  });

  describe("upload", () => {
    const account = { status: "action_required", pending: [], blockReasons: [] };

    // Just enough XMLHttpRequest to replay an upload: progress events, then the response.
    function fakeXhr(status: number, body: unknown, progress: [number, number][] = []) {
      const sent: {
        method?: string;
        url?: string;
        headers: Record<string, string>;
        body?: unknown;
      } = { headers: {} };
      class FakeXhr {
        status = status;
        responseText = body === null ? "" : JSON.stringify(body);
        upload: { onprogress: ((event: Partial<ProgressEvent>) => void) | null } = {
          onprogress: null,
        };
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        open(method: string, url: string) {
          sent.method = method;
          sent.url = url;
        }
        setRequestHeader(name: string, value: string) {
          sent.headers[name] = value;
        }
        getResponseHeader(name: string) {
          return name.toLowerCase() === "content-type" ? "application/json" : null;
        }
        send(payload: unknown) {
          sent.body = payload;
          for (const [loaded, total] of progress) {
            this.upload.onprogress?.({ lengthComputable: true, loaded, total });
          }
          this.onload?.();
        }
      }
      return { sent, xhr: () => new FakeXhr() as unknown as XMLHttpRequest };
    }

    const upload = (xhr: () => XMLHttpRequest, onProgress?: (fraction: number) => void) => {
      const formData = new FormData();
      formData.set("pendingItemId", "doc-1");
      return createApiClient({ getToken: () => "t-1", getLocale: () => "es", xhr }).upload(
        "/account/documents",
        formData,
        { response: "account", ...(onProgress && { onProgress }) },
      );
    };

    it("reports progress as fractions and resolves to the response", async () => {
      const { xhr } = fakeXhr(200, account, [
        [25, 100],
        [100, 100],
      ]);
      const fractions: number[] = [];
      await expect(upload(xhr, (fraction) => fractions.push(fraction))).resolves.toEqual(account);
      expect(fractions).toEqual([0.25, 1]);
    });

    it("sends bearer and Accept-Language, and the form data as the body", async () => {
      const { sent, xhr } = fakeXhr(200, account);
      await upload(xhr);
      expect(sent.method).toBe("POST");
      expect(sent.url).toBe("/api/v1/account/documents");
      expect(sent.headers).toMatchObject({ Authorization: "Bearer t-1", "Accept-Language": "es" });
      expect(sent.headers).not.toHaveProperty("Content-Type");
      expect(sent.body).toBeInstanceOf(FormData);
    });

    it("resolves to undefined for an empty success, like request()", async () => {
      await expect(upload(fakeXhr(204, null).xhr)).resolves.toBeUndefined();
      await expect(upload(fakeXhr(205, null).xhr)).resolves.toBeUndefined();
      await expect(upload(fakeXhr(200, null).xhr)).resolves.toBeUndefined();
    });

    it("turns an error body into ApiError", async () => {
      const { xhr } = fakeXhr(422, { error: { code: "validation_failed", message: "x" } });
      await expect(upload(xhr)).rejects.toMatchObject({ code: "validation_failed", status: 422 });
    });
  });
});
