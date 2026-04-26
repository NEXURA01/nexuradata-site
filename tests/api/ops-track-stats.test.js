import { describe, it, expect, vi } from "vitest";
import { onRequestGet, onRequestOptions } from "../../functions/api/ops/track-stats.js";

const makeReq = (url = "https://nexuradata.ca/api/ops/track-stats", headers = {}) =>
    new Request(url, { method: "GET", headers });

const makeDb = ({ firstRow = {}, allRows = { results: [] }, throwOn = null } = {}) => {
    let callIndex = 0;
    return {
        prepare: vi.fn(() => {
            const idx = callIndex++;
            const chain = {
                bind: vi.fn(() => chain),
                first: vi.fn(async () => {
                    if (throwOn && throwOn.has(idx)) throw new Error("boom");
                    return firstRow;
                }),
                all: vi.fn(async () => {
                    if (throwOn && throwOn.has(idx)) throw new Error("boom");
                    return allRows;
                }),
            };
            return chain;
        }),
    };
};

describe("OPTIONS /api/ops/track-stats", () => {
    it("returns CORS preflight", async () => {
        const res = await onRequestOptions();
        expect(res.status).toBe(204);
        expect(res.headers.get("access-control-allow-methods")).toContain("GET");
    });
});

describe("GET /api/ops/track-stats", () => {
    it("returns 503 when DB binding missing", async () => {
        const res = await onRequestGet({ env: {}, request: makeReq() });
        expect(res.status).toBe(503);
    });

    it("returns 403 when caller is unauthorized on prod host", async () => {
        const res = await onRequestGet({
            env: { INTAKE_DB: makeDb(), OPS_ACCESS_ALLOWED_DOMAIN: "nexuradata.ca" },
            request: makeReq(),
        });
        expect(res.status).toBe(403);
    });

    it("returns aggregates on localhost dev bypass", async () => {
        const db = makeDb({
            firstRow: { total: 42, uniques: 13, calls: 5 },
            allRows: {
                results: [
                    { event: "call-link", count: 5 },
                    { event: "page-view", count: 30 },
                ],
            },
        });
        const res = await onRequestGet({
            env: { INTAKE_DB: db },
            request: makeReq("http://localhost:8788/api/ops/track-stats?days=14"),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.window_days).toBe(14);
        expect(body.totals.events).toBe(42);
        expect(body.totals.unique_visitors).toBe(13);
        expect(body.totals.call_clicks).toBe(5);
        expect(Array.isArray(body.by_event)).toBe(true);
        expect(body.by_event[0]).toEqual({ event: "call-link", count: 5 });
    });

    it("clamps days to allowed window (1..90)", async () => {
        const db = makeDb({ firstRow: { total: 0 }, allRows: { results: [] } });
        const res = await onRequestGet({
            env: { INTAKE_DB: db },
            request: makeReq("http://localhost:8788/api/ops/track-stats?days=9999"),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.window_days).toBe(90);
    });

    it("uses default 7 day window when days param missing or invalid", async () => {
        const db = makeDb({ firstRow: { total: 0 }, allRows: { results: [] } });
        const res = await onRequestGet({
            env: { INTAKE_DB: db },
            request: makeReq("http://localhost:8788/api/ops/track-stats?days=abc"),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.window_days).toBe(7);
    });

    it("never throws on partial DB failures (returns zeros + empty arrays)", async () => {
        // Fail on every other call to simulate partial outages
        const throwOn = new Set([0, 2, 4, 6, 8]);
        const db = makeDb({ firstRow: { total: 0 }, allRows: { results: [] }, throwOn });
        const res = await onRequestGet({
            env: { INTAKE_DB: db },
            request: makeReq("http://localhost:8788/api/ops/track-stats"),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.totals.events).toBe(0);
    });

    it("coerces row counts to numbers", async () => {
        const db = makeDb({
            firstRow: { total: "17", uniques: "5", calls: "2" },
            allRows: {
                results: [
                    { event: "page-view", count: "10" },
                    { path: "/", count: "8" },
                    { locale: "fr", count: "12" },
                    { country: "CA", count: "9" },
                    { referrer: "https://google.com/", count: "3" },
                    { bucket: "2026-04-26T10", count: "4" },
                ],
            },
        });
        const res = await onRequestGet({
            env: { INTAKE_DB: db },
            request: makeReq("http://localhost:8788/api/ops/track-stats"),
        });
        const body = await res.json();
        expect(body.totals.events).toBe(17);
        expect(body.by_event[0].count).toBe(10);
        expect(typeof body.by_path[0].count).toBe("number");
    });
});
