import { describe, it, expect } from "vitest";
import { json, onOptions, parsePayload, methodNotAllowed } from "../../functions/_lib/http.js";

describe("json()", () => {
  it("returns a Response with JSON content-type", async () => {
    const res = json({ ok: true });
    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("content-type")).toBe("application/json; charset=UTF-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("applies custom status", async () => {
    const res = json({ ok: false }, { status: 400 });
    expect(res.status).toBe(400);
  });

  it("defaults to 200 status", () => {
    const res = json({});
    expect(res.status).toBe(200);
  });

  it("init.headers are merged into the headers object", () => {
    // Note: ...init spread at top level overrides the headers key,
    // so only init.headers remain when init also contains a headers property.
    const res = json({}, { headers: { "X-Custom": "test", "content-type": "application/json; charset=UTF-8" } });
    expect(res.headers.get("X-Custom")).toBe("test");
  });

  it("serialises nested objects", async () => {
    const payload = { items: [{ id: 1 }, { id: 2 }], count: 2 };
    const res = json(payload);
    expect(await res.json()).toEqual(payload);
  });

  it("handles null payload", async () => {
    const res = json(null);
    expect(await res.json()).toBeNull();
  });
});

describe("onOptions()", () => {
  it("returns 204 with CORS headers", () => {
    const res = onOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get("allow")).toBe("GET, POST, OPTIONS");
    expect(res.headers.get("access-control-allow-origin")).toBe("https://nexuradata.ca");
    expect(res.headers.get("access-control-allow-methods")).toBe("GET, POST, OPTIONS");
    expect(res.headers.get("access-control-allow-headers")).toBe("content-type");
  });

  it("accepts custom allow methods", () => {
    const res = onOptions("POST, OPTIONS");
    expect(res.headers.get("allow")).toBe("POST, OPTIONS");
    expect(res.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
  });

  it("has empty body", async () => {
    const res = onOptions();
    expect(await res.text()).toBe("");
  });
});

describe("parsePayload()", () => {
  it("parses JSON body", async () => {
    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test" })
    });
    const result = await parsePayload(request);
    expect(result).toEqual({ name: "Test" });
  });

  it("parses form-urlencoded body", async () => {
    const body = new URLSearchParams({ name: "Test", email: "a@b.com" });
    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    });
    const result = await parsePayload(request);
    expect(result.name).toBe("Test");
    expect(result.email).toBe("a@b.com");
  });

  it("throws on unsupported content-type", async () => {
    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hello"
    });
    await expect(parsePayload(request)).rejects.toThrow("Format de requête non pris en charge.");
  });

  it("throws when content-type is missing", async () => {
    const request = new Request("https://example.com/api", {
      method: "POST",
      body: "data"
    });
    await expect(parsePayload(request)).rejects.toThrow();
  });
});

describe("methodNotAllowed()", () => {
  it("returns 405 with error body", async () => {
    const res = methodNotAllowed();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.message).toBe("Méthode non autorisée.");
  });
});
