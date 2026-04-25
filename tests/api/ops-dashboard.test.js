import { describe, it, expect, vi } from "vitest";
import { onRequestGet, onRequestOptions } from "../../functions/api/ops/dashboard.js";

const makeReq = (url = "https://nexuradata.ca/api/ops/dashboard", headers = {}) =>
    new Request(url, { method: "GET", headers });

// Build a D1-like mock that returns prebaked rows for `.first()` / `.all()`.
// Because the dashboard issues many independent prepares, we route each call
// to a fresh chainable that just returns the same `firstRow` / `allRows`.
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

describe("OPTIONS /api/ops/dashboard", () => {
    it("returns CORS preflight", async () => {
        const res = await onRequestOptions();
        expect(res.status).toBe(204);
        expect(res.headers.get("access-control-allow-methods")).toContain("GET");
    });
});

describe("GET /api/ops/dashboard", () => {
    it("returns 503 when DB binding missing", async () => {
        const res = await onRequestGet({ env: {}, request: makeReq() });
        expect(res.status).toBe(503);
    });

    it("returns 403 when caller is not authorized (no Access header on prod host)", async () => {
        const res = await onRequestGet({
            env: { INTAKE_DB: makeDb(), OPS_ACCESS_ALLOWED_DOMAIN: "nexuradata.ca" },
            request: makeReq(),
        });
        expect(res.status).toBe(403);
    });

    it("returns aggregates on localhost (dev bypass)", async () => {
        const db = makeDb({
            firstRow: {
                today_cents: 12_345,
                month_cents: 234_567,
                year_cents: 1_000_000,
                window_cents: 50_000,
                window_count: 7,
                n: 3,
                cents: 9_999,
                captured: 40,
                converted: 5,
                recovered: 12,
                unsubscribed: 1,
                captured_window: 20,
                converted_window: 3,
                total: 6,
                pending: 2,
                confirmed: 3,
                expired: 1,
                window_cad_cents: 150_000,
                unused: 25,
                assigned: 4,
                spent: 10,
            },
            allRows: { results: [] },
        });

        const res = await onRequestGet({
            env: { INTAKE_DB: db },
            request: makeReq("http://localhost:8788/api/ops/dashboard?days=14"),
        });
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.ok).toBe(true);
        expect(j.window_days).toBe(14);
        expect(j.revenue.today_cad).toBe(123.45);
        expect(j.revenue.month_cad).toBe(2345.67);
        expect(j.outstanding.cad).toBe(99.99);
        expect(j.btc.pool.unused).toBe(25);
        expect(j.btc.pool.low_warning).toBe(false); // 25 >= 20
        expect(Array.isArray(j.daily_revenue)).toBe(true);
        expect(j.daily_revenue.length).toBe(14);
    });

    it("flags BTC pool low warning when unused < 20", async () => {
        const db = makeDb({
            firstRow: {
                today_cents: 0, month_cents: 0, year_cents: 0, window_cents: 0, window_count: 0,
                n: 0, cents: 0,
                captured: 0, converted: 0, recovered: 0, unsubscribed: 0,
                captured_window: 0, converted_window: 0,
                total: 0, pending: 0, confirmed: 0, expired: 0, window_cad_cents: 0,
                unused: 5, assigned: 1, spent: 0,
            },
        });
        const res = await onRequestGet({
            env: { INTAKE_DB: db },
            request: makeReq("http://localhost/api/ops/dashboard"),
        });
        const j = await res.json();
        expect(j.btc.pool.low_warning).toBe(true);
    });

    it("clamps days param to [7,180]", async () => {
        const db = makeDb({ firstRow: {}, allRows: { results: [] } });
        const res = await onRequestGet({
            env: { INTAKE_DB: db },
            request: makeReq("http://localhost/api/ops/dashboard?days=999"),
        });
        const j = await res.json();
        expect(j.window_days).toBe(180);
        expect(j.daily_revenue.length).toBe(180);
    });

    it("survives partial DB failure thanks to safe() wrapper", async () => {
        // Throw on one of the queries; endpoint should still return 200
        const db = makeDb({
            firstRow: { unused: 30 },
            allRows: { results: [] },
            throwOn: new Set([0, 2]),
        });
        const res = await onRequestGet({
            env: { INTAKE_DB: db },
            request: makeReq("http://localhost/api/ops/dashboard?days=7"),
        });
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.ok).toBe(true);
    });
});
