import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the cases sync side-effect so tests focus on signature verification + status mapping
vi.mock("../../functions/_lib/cases.js", () => ({
    syncPaymentRequestFromStripe: vi.fn(async () => ({ paymentRequestId: "PR-TEST-123" })),
}));

const { onRequestPost, onRequestOptions } = await import("../../functions/api/stripe-webhook.js");
const { syncPaymentRequestFromStripe } = await import("../../functions/_lib/cases.js");

const SECRET = "whsec_test_secret_value";

const toHex = (buf) =>
    Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function signPayload(secret, timestamp, rawBody) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const digest = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(`${timestamp}.${rawBody}`),
    );
    return toHex(digest);
}

async function makeSignedRequest({ secret = SECRET, payload, timestamp, signature } = {}) {
    const ts = timestamp ?? Math.floor(Date.now() / 1000);
    const raw = JSON.stringify(payload);
    const sig = signature ?? (await signPayload(secret, ts, raw));
    return new Request("https://x/api/stripe-webhook", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "Stripe-Signature": `t=${ts},v1=${sig}`,
        },
        body: raw,
    });
}

const baseEnv = () => ({
    INTAKE_DB: { prepare: vi.fn() },
    STRIPE_WEBHOOK_SECRET: SECRET,
    STRIPE_SECRET_KEY: "sk_test_x",
});

describe("OPTIONS /api/stripe-webhook", () => {
    it("returns CORS preflight", async () => {
        const res = await onRequestOptions({ env: baseEnv(), request: new Request("https://x", { method: "OPTIONS" }) });
        expect([200, 204]).toContain(res.status);
        expect(res.headers.get("access-control-allow-methods")).toMatch(/POST/);
    });
});

describe("POST /api/stripe-webhook", () => {
    beforeEach(() => {
        syncPaymentRequestFromStripe.mockClear();
    });

    it("returns 503 when DB binding missing", async () => {
        const req = await makeSignedRequest({ payload: { id: "evt_1", type: "checkout.session.completed" } });
        const res = await onRequestPost({ env: { STRIPE_WEBHOOK_SECRET: SECRET }, request: req });
        expect(res.status).toBe(503);
    });

    it("returns 400 on missing Stripe-Signature header", async () => {
        const req = new Request("https://x/api/stripe-webhook", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: "evt_1" }),
        });
        const res = await onRequestPost({ env: baseEnv(), request: req });
        expect(res.status).toBe(400);
    });

    it("returns 400 on bad signature (tampered)", async () => {
        const req = await makeSignedRequest({
            payload: { id: "evt_2", type: "checkout.session.completed" },
            signature: "deadbeef".repeat(8),
        });
        const res = await onRequestPost({ env: baseEnv(), request: req });
        expect(res.status).toBe(400);
        expect(syncPaymentRequestFromStripe).not.toHaveBeenCalled();
    });

    it("returns 400 on expired timestamp (>5 min skew)", async () => {
        const oldTs = Math.floor(Date.now() / 1000) - 600;
        const req = await makeSignedRequest({
            payload: { id: "evt_3", type: "checkout.session.completed" },
            timestamp: oldTs,
        });
        const res = await onRequestPost({ env: baseEnv(), request: req });
        expect(res.status).toBe(400);
        expect(syncPaymentRequestFromStripe).not.toHaveBeenCalled();
    });

    it("returns 400 when webhook secret missing in env", async () => {
        const req = await makeSignedRequest({ payload: { id: "evt_4", type: "checkout.session.completed" } });
        const env = { INTAKE_DB: { prepare: vi.fn() } }; // no STRIPE_WEBHOOK_SECRET
        const res = await onRequestPost({ env, request: req });
        expect(res.status).toBe(400);
    });

    it("returns 400 when signature signed with wrong secret", async () => {
        const req = await makeSignedRequest({
            payload: { id: "evt_5", type: "checkout.session.completed" },
            secret: "whsec_wrong_secret",
        });
        const res = await onRequestPost({ env: baseEnv(), request: req });
        expect(res.status).toBe(400);
    });

    it("accepts a valid signed event and forwards to syncPaymentRequestFromStripe", async () => {
        const payload = {
            id: "evt_ok",
            type: "checkout.session.completed",
            data: { object: { id: "cs_test_1", metadata: { payment_request_id: "PR-OK-1" } } },
        };
        const req = await makeSignedRequest({ payload });
        const res = await onRequestPost({ env: baseEnv(), request: req });
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.ok).toBe(true);
        expect(j.received).toBe(true);
        expect(j.paymentRequestId).toBe("PR-TEST-123");
        expect(syncPaymentRequestFromStripe).toHaveBeenCalledTimes(1);
        const [, eventArg] = syncPaymentRequestFromStripe.mock.calls[0];
        expect(eventArg.id).toBe("evt_ok");
        expect(eventArg.type).toBe("checkout.session.completed");
    });

    it("returns 400 when downstream sync throws (event not processable)", async () => {
        syncPaymentRequestFromStripe.mockRejectedValueOnce(new Error("Unknown payment request"));
        const req = await makeSignedRequest({
            payload: { id: "evt_bad_meta", type: "checkout.session.completed", data: { object: {} } },
        });
        const res = await onRequestPost({ env: baseEnv(), request: req });
        expect(res.status).toBe(400);
        const j = await res.json();
        expect(j.ok).toBe(false);
    });
});
