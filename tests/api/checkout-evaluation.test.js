import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cases lib so the test focuses on endpoint orchestration, not DB internals.
vi.mock("../../functions/_lib/cases.js", () => ({
    validateSubmission: vi.fn((p) => {
        if (!p.nom || !p.courriel || !p.message) {
            throw new Error("Complétez tous les champs requis.");
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.courriel)) {
            throw new Error("Adresse courriel invalide.");
        }
        return {
            nom: p.nom,
            courriel: p.courriel,
            telephone: p.telephone || "",
            support: p.support || "autre",
            urgence: p.urgence || "standard",
            message: p.message,
            sourcePath: p.sourcePath || "/",
        };
    }),
    createCase: vi.fn(async (_env, sub) => ({
        caseId: "NX-2026-04-26-AB12",
        accessCode: "TESTCODE",
        createdAt: new Date().toISOString(),
        status: "Dossier reçu",
        nextStep: "Lecture initiale.",
        clientSummary: "Reçu.",
        ...sub,
    })),
    createCasePaymentRequest: vi.fn(async (_env, payload) => ({
        paymentRequestId: "PAY-20260426-ABCDEF",
        caseId: payload.caseId,
        paymentKind: payload.paymentKind,
        status: "open",
        label: payload.label,
        amountCents: 7500,
        currency: "cad",
        checkoutUrl: "https://checkout.stripe.com/c/test_session_url",
    })),
}));

vi.mock("../../functions/_lib/email.js", () => ({
    sendClientAccessEmail: vi.fn(async () => ({ sent: true })),
    sendLabNotificationEmail: vi.fn(async () => ({ sent: true })),
}));

const { onRequestPost, onRequestOptions } = await import(
    "../../functions/api/checkout/evaluation.js"
);
const cases = await import("../../functions/_lib/cases.js");

let ipCounter = 0;
const makeReq = (body, headers = {}) => {
    ipCounter += 1;
    return new Request("https://nexuradata.ca/api/checkout/evaluation", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "cf-connecting-ip": `203.0.113.${ipCounter}`,
            ...headers,
        },
        body: JSON.stringify(body),
    });
};

const baseEnv = () => ({
    INTAKE_DB: { prepare: vi.fn() },
    ACCESS_CODE_SECRET: "test-secret",
    STRIPE_SECRET_KEY: "sk_test_x",
});

const validBody = () => ({
    nom: "Jane Doe",
    courriel: "jane@example.com",
    telephone: "514-555-0100",
    message: "Disque externe ne s'allume plus, données importantes.",
    consentement: true,
    locale: "fr",
});

describe("OPTIONS /api/checkout/evaluation", () => {
    it("returns CORS preflight 204", () => {
        const res = onRequestOptions();
        expect(res.status).toBe(204);
        expect(res.headers.get("access-control-allow-methods")).toMatch(/POST/);
    });
});

describe("POST /api/checkout/evaluation", () => {
    beforeEach(() => {
        cases.validateSubmission.mockClear();
        cases.createCase.mockClear();
        cases.createCasePaymentRequest.mockClear();
    });

    it("returns 503 when INTAKE_DB missing", async () => {
        const res = await onRequestPost({ env: {}, request: makeReq(validBody()) });
        expect(res.status).toBe(503);
    });

    it("returns 503 when ACCESS_CODE_SECRET missing", async () => {
        const res = await onRequestPost({
            env: { INTAKE_DB: {} },
            request: makeReq(validBody()),
        });
        expect(res.status).toBe(503);
    });

    it("returns 503 when STRIPE_SECRET_KEY missing", async () => {
        const res = await onRequestPost({
            env: { INTAKE_DB: {}, ACCESS_CODE_SECRET: "x" },
            request: makeReq(validBody()),
        });
        expect(res.status).toBe(503);
    });

    it("returns 400 on missing required fields", async () => {
        const res = await onRequestPost({
            env: baseEnv(),
            request: makeReq({ nom: "Jane", consentement: true }),
        });
        expect(res.status).toBe(400);
    });

    it("returns 400 on invalid email", async () => {
        const res = await onRequestPost({
            env: baseEnv(),
            request: makeReq({ ...validBody(), courriel: "not-an-email" }),
        });
        expect(res.status).toBe(400);
    });

    it("returns 200 with checkout url on happy path (FR)", async () => {
        const res = await onRequestPost({
            env: baseEnv(),
            request: makeReq(validBody()),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.caseId).toMatch(/^NX-/);
        expect(body.paymentRequestId).toMatch(/^PAY-/);
        expect(body.url).toBe("https://checkout.stripe.com/c/test_session_url");
        expect(body.amountCents).toBe(7500);
        expect(body.currency).toBe("cad");

        // Ensure case is created BEFORE Stripe call (per stripe.instructions.md)
        const caseCallOrder = cases.createCase.mock.invocationCallOrder[0];
        const stripeCallOrder = cases.createCasePaymentRequest.mock.invocationCallOrder[0];
        expect(caseCallOrder).toBeLessThan(stripeCallOrder);

        // Ensure payment kind is 'evaluation' and amount is "75.00" CAD
        const paymentArgs = cases.createCasePaymentRequest.mock.calls[0][1];
        expect(paymentArgs.paymentKind).toBe("evaluation");
        expect(paymentArgs.amount).toBe("75.00");
        expect(paymentArgs.currency).toBe("cad");
        expect(paymentArgs.label).toMatch(/Évaluation/);
    });

    it("uses English label when locale=en", async () => {
        await onRequestPost({
            env: baseEnv(),
            request: makeReq({ ...validBody(), locale: "en" }),
        });
        const paymentArgs = cases.createCasePaymentRequest.mock.calls[0][1];
        expect(paymentArgs.label).toMatch(/diagnostic/i);
        expect(paymentArgs.description).toMatch(/recovery/i);
    });

    it("returns 502 when Stripe / payment creation fails", async () => {
        cases.createCasePaymentRequest.mockRejectedValueOnce(new Error("Stripe down"));
        const res = await onRequestPost({
            env: baseEnv(),
            request: makeReq(validBody()),
        });
        expect(res.status).toBe(502);
        const body = await res.json();
        expect(body.ok).toBe(false);
        expect(body.error).toBe("stripe-error");
    });

    it("rejects honeypot submissions", async () => {
        cases.validateSubmission.mockImplementationOnce(() => {
            throw new Error("Requête rejetée.");
        });
        const res = await onRequestPost({
            env: baseEnv(),
            request: makeReq({ ...validBody(), website: "spam.example.com" }),
        });
        expect(res.status).toBe(400);
    });
});
