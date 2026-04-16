import { describe, it, expect, vi, beforeEach } from "vitest";
import { onRequestPost as intakeHandler, onRequestOptions as intakeOptions } from "../../functions/api/intake.js";
import { onRequestPost as statusHandler, onRequestOptions as statusOptions, onRequest as statusFallback } from "../../functions/api/status.js";
import { onRequestPost as webhookHandler } from "../../functions/api/stripe-webhook.js";

// ─── Helpers ────────────────────────────────────────────────

const makeContext = (body, env = {}, method = "POST") => ({
  request: new Request("https://nexuradata.ca/api/intake", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }),
  env
});

// ─── intake endpoint ────────────────────────────────────────

describe("POST /api/intake", () => {
  it("returns 503 when INTAKE_DB is not configured", async () => {
    const ctx = makeContext({}, {});
    const res = await intakeHandler(ctx);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.fallback).toBe("mailto");
  });

  it("returns 503 when ACCESS_CODE_SECRET is missing", async () => {
    const ctx = makeContext({}, { INTAKE_DB: {} });
    const res = await intakeHandler(ctx);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 400 for invalid submission (missing fields)", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run: vi.fn(), first: vi.fn() }),
        all: vi.fn()
      })
    };
    const env = { INTAKE_DB: mockDb, ACCESS_CODE_SECRET: "test-secret" };
    const ctx = makeContext({ nom: "" }, env);
    const res = await intakeHandler(ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("OPTIONS handler returns 204", () => {
    const res = intakeOptions();
    expect(res.status).toBe(204);
  });
});

// ─── status endpoint ────────────────────────────────────────

describe("POST /api/status", () => {
  it("returns 503 when INTAKE_DB is not configured", async () => {
    const ctx = makeContext({}, {});
    ctx.request = new Request("https://nexuradata.ca/api/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const res = await statusHandler(ctx);
    expect(res.status).toBe(503);
  });

  it("returns 400 for missing credentials", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run: vi.fn(), first: vi.fn(), all: vi.fn() }),
        all: vi.fn()
      })
    };
    const env = { INTAKE_DB: mockDb };
    const ctx = makeContext({}, env);
    ctx.request = new Request("https://nexuradata.ca/api/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const res = await statusHandler(ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 404 when case not found", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn(),
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] })
        }),
        all: vi.fn().mockResolvedValue({ results: [] })
      })
    };
    const env = { INTAKE_DB: mockDb };
    const ctx = makeContext(
      { caseId: "NX-20260101-ABCD1234", accessCode: "ABCD-EFGH" },
      env
    );
    ctx.request = new Request("https://nexuradata.ca/api/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caseId: "NX-20260101-ABCD1234", accessCode: "ABCD-EFGH" })
    });
    const res = await statusHandler(ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("OPTIONS handler returns 204", () => {
    const res = statusOptions();
    expect(res.status).toBe(204);
  });

  it("fallback handler returns 405", async () => {
    const res = statusFallback();
    expect(res.status).toBe(405);
  });
});

// ─── stripe webhook endpoint ────────────────────────────────

describe("POST /api/stripe-webhook", () => {
  it("returns 503 when INTAKE_DB is not configured", async () => {
    const ctx = makeContext({}, {});
    ctx.request = new Request("https://nexuradata.ca/api/stripe-webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const res = await webhookHandler(ctx);
    expect(res.status).toBe(503);
  });

  it("returns 400 when signature verification fails", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ run: vi.fn(), first: vi.fn(), all: vi.fn() }),
        all: vi.fn()
      })
    };
    const env = { INTAKE_DB: mockDb, STRIPE_WEBHOOK_SECRET: "whsec_test" };
    const ctx = {
      request: new Request("https://nexuradata.ca/api/stripe-webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Stripe-Signature": "t=12345,v1=badsig"
        },
        body: JSON.stringify({ type: "checkout.session.completed" })
      }),
      env
    };
    const res = await webhookHandler(ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
