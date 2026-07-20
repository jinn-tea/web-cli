import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

/**
 * The transport is the most load-bearing module in the app — every request
 * passes through it, and its refresh logic is the kind that fails silently and
 * intermittently. These tests pin the behavior that's expensive to debug in
 * production: envelope unwrapping, error typing, and single-flight refresh.
 */

const ENVELOPE_OK = (data: unknown) => ({
  ok: true,
  status: 200,
  headers: new Headers({ "content-type": "application/json" }),
  json: async () => ({ statusCode: 200, data, error: null }),
});

const ENVELOPE_ERROR = (statusCode: number, message: string) => ({
  ok: statusCode < 400,
  status: statusCode,
  statusText: message,
  headers: new Headers({ "content-type": "application/json" }),
  json: async () => ({
    statusCode,
    data: null,
    error: { timestamp: "2026-01-01T00:00:00Z", message },
  }),
});

let backendClient: typeof import("./backend-client").backendClient;
let setTokenRefresher: typeof import("./backend-client").setTokenRefresher;
let tokenStore: typeof import("./token-store").tokenStore;
let ApiError: typeof import("./errors").ApiError;
let NetworkError: typeof import("./errors").NetworkError;
let ParseError: typeof import("./errors").ParseError;

beforeEach(async () => {
  // The refresher and the in-flight refresh promise are module-level state, so
  // each test needs a fresh module graph.
  vi.resetModules();
  // Everything must come from THAT graph: a statically-imported tokenStore
  // would be a different instance than the one the client writes to, and a
  // statically-imported error class would fail `instanceof` against the
  // freshly-loaded one.
  const [client, tokens, errors] = await Promise.all([
    import("./backend-client"),
    import("./token-store"),
    import("./errors"),
  ]);
  backendClient = client.backendClient;
  setTokenRefresher = client.setTokenRefresher;
  tokenStore = tokens.tokenStore;
  ApiError = errors.ApiError;
  NetworkError = errors.NetworkError;
  ParseError = errors.ParseError;
  tokenStore.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("backendClient", () => {
  it("unwraps the envelope and returns data directly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(ENVELOPE_OK({ id: "1", name: "Ada" })),
    );

    await expect(backendClient.get("/users/1")).resolves.toEqual({
      id: "1",
      name: "Ada",
    });
  });

  it("attaches the bearer token when one is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ENVELOPE_OK(null));
    vi.stubGlobal("fetch", fetchMock);
    tokenStore.set("token-123");

    await backendClient.get("/me");

    const headers = fetchMock.mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe("Bearer token-123");
  });

  it("omits the bearer token for public endpoints", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ENVELOPE_OK(null));
    vi.stubGlobal("fetch", fetchMock);
    tokenStore.set("token-123");

    await backendClient.post("/auth/forgot-password", {}, { auth: false });

    const headers = fetchMock.mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBeUndefined();
  });

  it("throws a typed ApiError carrying the backend's message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(ENVELOPE_ERROR(409, "Email already in use")),
    );

    // The UI branches on statusCode and shows message — so both must survive.
    await expect(backendClient.post("/users", {})).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 409,
      message: "Email already in use",
    });
  });

  it("throws NetworkError when the request never leaves", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));

    await expect(backendClient.get("/anything")).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it("refreshes once on 401 and replays the original request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ENVELOPE_ERROR(401, "Token expired"))
      .mockResolvedValueOnce(ENVELOPE_OK({ id: "1" }));
    vi.stubGlobal("fetch", fetchMock);

    setTokenRefresher(async () => "fresh-token");
    tokenStore.set("stale-token");

    await expect(backendClient.get("/orders")).resolves.toEqual({ id: "1" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The replay must carry the NEW token, or it 401s forever.
    const replayHeaders = fetchMock.mock.calls[1][1].headers as Record<
      string,
      string
    >;
    expect(replayHeaders.Authorization).toBe("Bearer fresh-token");
  });

  it("shares ONE refresh across concurrent 401s", async () => {
    // Three parallel requests hitting 401 must not fire three refreshes — that
    // races the backend's token rotation and logs the user out at random.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        return tokenStore.get() === "fresh-token"
          ? ENVELOPE_OK({ ok: true })
          : ENVELOPE_ERROR(401, "Token expired");
      }),
    );

    const refresher = vi.fn().mockResolvedValue("fresh-token");
    setTokenRefresher(refresher);
    tokenStore.set("stale-token");

    await Promise.all([
      backendClient.get("/a"),
      backendClient.get("/b"),
      backendClient.get("/c"),
    ]);

    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it("gives up (and clears the token) when the refresh itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(ENVELOPE_ERROR(401, "Token expired")),
    );

    setTokenRefresher(async () => {
      throw new ApiError(401, "Refresh rejected");
    });
    tokenStore.set("stale-token");

    await expect(backendClient.get("/orders")).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(tokenStore.get()).toBeNull();
  });

  it("does not retry a 401 forever", async () => {
    // Refresh 'succeeds' but the replay still 401s — must stop after one retry.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(ENVELOPE_ERROR(401, "Token expired"));
    vi.stubGlobal("fetch", fetchMock);

    setTokenRefresher(async () => "still-bad");
    tokenStore.set("stale-token");

    await expect(backendClient.get("/orders")).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

/**
 * Response validation.
 *
 * `backendClient.get<Order>(…)` without a `parse` is a CLAIM, not a check —
 * TypeScript erases it, so a backend that renames a field hands the app
 * `undefined` and the failure surfaces somewhere unrelated. These pin the
 * behaviour that makes the type true at runtime.
 */
describe("response parsing", () => {
  const orderSchema = z.object({
    id: z.string(),
    total: z.number(),
    createdAt: z.string(),
  });

  it("returns the parsed value when the response matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          ENVELOPE_OK({ id: "1", total: 42, createdAt: "2026-01-01" }),
        ),
    );

    await expect(
      backendClient.get("/orders/1", { parse: orderSchema.parse }),
    ).resolves.toEqual({ id: "1", total: 42, createdAt: "2026-01-01" });
  });

  it("throws a ParseError naming the endpoint and the field", async () => {
    // `total` arrives as a string — the exact drift that silently produces NaN
    // in a currency formatter several layers away.
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          ENVELOPE_OK({ id: "1", total: "42", createdAt: "2026-01-01" }),
        ),
    );

    const error = await backendClient
      .get("/orders/1", { parse: orderSchema.parse })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ParseError);
    expect((error as InstanceType<typeof ParseError>).endpoint).toBe(
      "GET /orders/1",
    );
    expect((error as InstanceType<typeof ParseError>).message).toContain(
      "total",
    );
  });

  it("reports the index of the offending row in a list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        ENVELOPE_OK({
          items: [
            { id: "1", total: 1, createdAt: "x" },
            { id: "2", total: null, createdAt: "x" },
          ],
        }),
      ),
    );

    const error = await backendClient
      .get("/orders", {
        parse: z.object({ items: z.array(orderSchema) }).parse,
      })
      .catch((e: unknown) => e);

    expect((error as InstanceType<typeof ParseError>).message).toContain(
      "items.1.total",
    );
  });

  it("ignores fields the schema doesn't declare", async () => {
    // The backend ADDING a field must never break a client — this is why
    // schema-per-response doesn't force the backend into lockstep releases.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        ENVELOPE_OK({
          id: "1",
          total: 42,
          createdAt: "2026-01-01",
          somethingNew: true,
        }),
      ),
    );

    await expect(
      backendClient.get("/orders/1", { parse: orderSchema.parse }),
    ).resolves.toEqual({ id: "1", total: 42, createdAt: "2026-01-01" });
  });

  it("leaves the response untouched when no parse is given", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ENVELOPE_OK({ any: 1 })));

    await expect(backendClient.get("/legacy")).resolves.toEqual({ any: 1 });
  });
});
