import { describe, it, expect, vi } from "vitest";
import { onRequestPost as captureHandler } from "../../functions/api/leads/capture.js";
import { onRequestPost as recoverHandler } from "../../functions/api/leads/recover.js";
import { onRequestGet as unsubGet } from "../../functions/api/leads/unsubscribe.js";

const makeReq = (url, body, method = "POST", headers = {}) =>
    new Request(url, {
        method,
        headers: { "content-type": "application/json", ...headers },
        body: body == null ? undefined : JSON.stringify(body),
    });

describe("POST /api/leads/capture", () => {
    it("returns 503 when DB missing", async () => {
        const res = await captureHandler({
            request: makeReq("https://x/api/leads/capture", { email: "a@b.co", consent: true }),
            env: {},
        });
        expect(res.status).toBe(503);
    });

    it("returns 400 for invalid email", async () => {
        const res = await captureHandler({
            request: makeReq("https://x/api/leads/capture", { email: "bad", consent: true }),
            env: { INTAKE_DB: {} },
        });
        expect(res.status).toBe(400);
    });

    it("returns 400 without consent", async () => {
        const res = await captureHandler({
            request: makeReq("https://x/api/leads/capture", { email: "a@b.co", consent: false }),
            env: { INTAKE_DB: {} },
        });
        expect(res.status).toBe(400);
    });

    it("silently drops honeypot", async () => {
        const res = await captureHandler({
            request: makeReq("https://x/api/leads/capture", {
                email: "a@b.co",
                consent: true,
                website: "spam",
            }),
            env: { INTAKE_DB: {} },
        });
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.queued).toBe(false);
    });

    it("captures a valid lead", async () => {
        const db = {
            prepare: vi.fn().mockReturnValue({
                bind: vi.fn().mockReturnValue({
                    first: vi.fn().mockResolvedValue(null),
                    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
                }),
            }),
        };
        const res = await captureHandler({
            request: makeReq("https://x/api/leads/capture", {
                email: "Lead@Example.CA",
                consent: true,
                device: "hdd",
                issue: "mechanical",
                estimateMinCad: 800,
                estimateMaxCad: 1600,
            }),
            env: { INTAKE_DB: db },
        });
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.ok).toBe(true);
        expect(j.queued).toBe(true);
    });
});

describe("POST /api/leads/recover", () => {
    it("returns 401 without ops secret", async () => {
        const res = await recoverHandler({
            request: makeReq("https://x/api/leads/recover", {}),
            env: { ACCESS_CODE_SECRET: "secret", INTAKE_DB: {} },
        });
        expect(res.status).toBe(401);
    });

    it("returns dry-run preview", async () => {
        const db = {
            prepare: vi.fn().mockReturnValue({
                bind: vi.fn().mockReturnValue({
                    all: vi.fn().mockResolvedValue({
                        results: [
                            { id: 1, email: "a@b.co", name: "", locale: "fr", captured_at: "2026-04-20" },
                        ],
                    }),
                }),
            }),
        };
        const res = await recoverHandler({
            request: makeReq(
                "https://x/api/leads/recover",
                { dryRun: true, batch: 5 },
                "POST",
                { "x-ops-secret": "secret" }
            ),
            env: { ACCESS_CODE_SECRET: "secret", INTAKE_DB: db },
        });
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.dryRun).toBe(true);
        expect(j.eligible).toBe(1);
    });
});

describe("GET /api/leads/unsubscribe", () => {
    it("returns 400 for invalid email", async () => {
        const res = await unsubGet({
            request: new Request("https://x/api/leads/unsubscribe?email=bad"),
            env: { INTAKE_DB: {} },
        });
        expect(res.status).toBe(400);
    });

    it("returns confirmation HTML for valid email", async () => {
        const db = {
            prepare: vi.fn().mockReturnValue({
                bind: vi.fn().mockReturnValue({
                    run: vi.fn().mockResolvedValue({}),
                }),
            }),
        };
        const res = await unsubGet({
            request: new Request("https://x/api/leads/unsubscribe?email=a@b.co"),
            env: { INTAKE_DB: db },
        });
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain("a@b.co");
        expect(html.toLowerCase()).toContain("désinscription");
    });
});
