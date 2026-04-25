import { describe, it, expect, vi } from "vitest";
import { onRequestPost as invoiceHandler } from "../../functions/api/btc/invoice.js";
import { onRequestGet as statusHandler } from "../../functions/api/btc/status.js";
import { onRequestPost as poolImportHandler } from "../../functions/api/btc/pool-import.js";

const makeReq = (url, body, method = "POST", headers = {}) =>
    new Request(url, {
        method,
        headers: { "content-type": "application/json", ...headers },
        body: body == null ? undefined : JSON.stringify(body),
    });

// Stub global fetch for CoinGecko / mempool.space
const stubFetch = (handler) => {
    globalThis.fetch = vi.fn(handler);
};

describe("POST /api/btc/invoice", () => {
    it("returns 503 when DB missing", async () => {
        const res = await invoiceHandler({
            request: makeReq("https://x/api/btc/invoice", { caseRef: "NX-1", amountCad: 100 }),
            env: {},
        });
        expect(res.status).toBe(503);
    });

    it("returns 400 for invalid amount", async () => {
        const res = await invoiceHandler({
            request: makeReq("https://x/api/btc/invoice", { caseRef: "NX-1", amountCad: -1 }),
            env: { INTAKE_DB: {} },
        });
        expect(res.status).toBe(400);
    });

    it("returns 503 when address pool empty", async () => {
        stubFetch(async () => new Response(JSON.stringify({ bitcoin: { cad: 90000 } }), { status: 200 }));
        const db = {
            prepare: vi.fn().mockReturnValue({
                bind: vi.fn().mockReturnValue({
                    first: vi.fn().mockResolvedValue(null),
                    run: vi.fn().mockResolvedValue({}),
                }),
            }),
        };
        const res = await invoiceHandler({
            request: makeReq("https://x/api/btc/invoice", { caseRef: "NX-1", amountCad: 1000 }),
            env: { INTAKE_DB: db },
        });
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.error).toBe("address-pool-empty");
    });

    it("creates invoice and returns address", async () => {
        stubFetch(async () => new Response(JSON.stringify({ bitcoin: { cad: 90000 } }), { status: 200 }));
        let claimed = false;
        const db = {
            prepare: vi.fn((_sql) => ({
                bind: vi.fn(() => ({
                    first: vi.fn(async () => {
                        if (!claimed) {
                            claimed = true;
                            return { id: 1, derivation_index: 0, address: "bc1qfakeaddress" };
                        }
                        return null;
                    }),
                    run: vi.fn(async () => ({ meta: { changes: 1 } })),
                })),
            })),
        };
        const res = await invoiceHandler({
            request: makeReq("https://x/api/btc/invoice", { caseRef: "NX-1", amountCad: 1000, expiresMin: 30 }),
            env: { INTAKE_DB: db },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.address).toBe("bc1qfakeaddress");
        expect(body.amountSats).toBeGreaterThan(0);
        expect(body.ref).toMatch(/^BTC-[A-Z0-9]{8}$/);
    });
});

describe("GET /api/btc/status", () => {
    it("returns 400 for invalid ref", async () => {
        const res = await statusHandler({
            request: new Request("https://x/api/btc/status?ref=bad"),
            env: { INTAKE_DB: {} },
        });
        expect(res.status).toBe(400);
    });

    it("returns 404 when invoice not found", async () => {
        const db = {
            prepare: vi.fn().mockReturnValue({
                bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }),
            }),
        };
        const res = await statusHandler({
            request: new Request("https://x/api/btc/status?ref=BTC-ABCDEFGH"),
            env: { INTAKE_DB: db },
        });
        expect(res.status).toBe(404);
    });

    it("returns invoice state without polling for terminal status", async () => {
        const db = {
            prepare: vi.fn().mockReturnValue({
                bind: vi.fn().mockReturnValue({
                    first: vi.fn().mockResolvedValue({
                        ref: "BTC-ABCDEFGH",
                        case_ref: "NX-1",
                        address: "bc1q...",
                        amount_sats: 1_000_000,
                        amount_cad_cents: 100000,
                        rate_cad_per_btc: 90000,
                        status: "confirmed",
                        created_at: "2026-04-25 00:00:00",
                        expires_at: "2026-04-25 01:00:00",
                        first_seen_at: "2026-04-25 00:10:00",
                        confirmed_at: "2026-04-25 00:30:00",
                        tx_id: "abc",
                        confirmations: 5,
                        received_sats: 1_000_000,
                        last_polled_at: "",
                    }),
                }),
            }),
        };
        const res = await statusHandler({
            request: new Request("https://x/api/btc/status?ref=BTC-ABCDEFGH"),
            env: { INTAKE_DB: db },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe("confirmed");
        expect(body.txId).toBe("abc");
    });
});

describe("POST /api/btc/pool-import", () => {
    it("returns 401 without ops secret", async () => {
        const res = await poolImportHandler({
            request: makeReq("https://x/api/btc/pool-import", { addresses: [] }),
            env: { ACCESS_CODE_SECRET: "secret", INTAKE_DB: {} },
        });
        expect(res.status).toBe(401);
    });

    it("returns 400 for invalid address", async () => {
        const res = await poolImportHandler({
            request: makeReq(
                "https://x/api/btc/pool-import",
                { addresses: ["not-bech32"] },
                "POST",
                { "x-ops-secret": "secret" }
            ),
            env: { ACCESS_CODE_SECRET: "secret", INTAKE_DB: {} },
        });
        expect(res.status).toBe(400);
    });

    it("imports valid addresses", async () => {
        const db = {
            prepare: vi.fn().mockReturnValue({
                bind: vi.fn().mockReturnValue({
                    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
                    first: vi
                        .fn()
                        .mockResolvedValue({ unused: 2, assigned: 0, spent: 0, retired: 0, total: 2 }),
                }),
                first: vi
                    .fn()
                    .mockResolvedValue({ unused: 2, assigned: 0, spent: 0, retired: 0, total: 2 }),
            }),
        };
        const res = await poolImportHandler({
            request: makeReq(
                "https://x/api/btc/pool-import",
                {
                    addresses: [
                        "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
                        "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
                    ],
                    startIndex: 0,
                },
                "POST",
                { "x-ops-secret": "secret" }
            ),
            env: { ACCESS_CODE_SECRET: "secret", INTAKE_DB: db },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.imported).toBe(2);
    });
});
