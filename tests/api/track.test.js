import { describe, it, expect, vi } from "vitest";
import { onRequest as trackHandler, onRequestOptions as trackOptions } from "../../functions/api/track.js";

const makeReq = (body, headers = {}) =>
    new Request("https://nexuradata.ca/api/track", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body)
    });

const mockDb = () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    return { prepare, _bind: bind, _run: run };
};

describe("POST /api/track", () => {
    it("OPTIONS returns 204 with POST allowed", () => {
        const res = trackOptions();
        expect(res.status).toBe(204);
        expect(res.headers.get("allow")).toContain("POST");
    });

    it("405 on GET", async () => {
        const request = new Request("https://nexuradata.ca/api/track", { method: "GET" });
        const res = await trackHandler({ request, env: {} });
        expect(res.status).toBe(405);
    });

    it("silently accepts unknown event without DB write", async () => {
        const db = mockDb();
        const request = makeReq({ event: "totally-fake-event", path: "/" });
        const res = await trackHandler({ request, env: { INTAKE_DB: db } });
        expect(res.status).toBe(200);
        expect((await res.json()).ok).toBe(true);
        expect(db.prepare).not.toHaveBeenCalled();
    });

    it("returns ok even when INTAKE_DB is missing", async () => {
        const request = makeReq({ event: "call-link", path: "/" });
        const res = await trackHandler({ request, env: {} });
        expect(res.status).toBe(200);
        expect((await res.json()).ok).toBe(true);
    });

    it("inserts allowed event with hashed IP and UA", async () => {
        const db = mockDb();
        const request = makeReq(
            { event: "call-header", path: "/tarifs", label: "header" },
            { "cf-connecting-ip": "1.2.3.4", "user-agent": "ua-test", "cf-ipcountry": "CA" }
        );
        const res = await trackHandler({ request, env: { INTAKE_DB: db, TRACKING_SALT: "s" } });
        expect(res.status).toBe(200);
        expect(db.prepare).toHaveBeenCalledOnce();
        const args = db._bind.mock.calls[0];
        expect(args[0]).toBe("call-header");
        expect(args[1]).toBe("/tarifs");
        expect(args[2]).toBe("header");
        expect(args[7]).toBe("CA"); // country
        // ip_hash, ua_hash must be 64-hex SHA-256 strings, not raw IP/UA
        expect(args[5]).toMatch(/^[0-9a-f]{64}$/);
        expect(args[6]).toMatch(/^[0-9a-f]{64}$/);
        expect(args[5]).not.toContain("1.2.3.4");
        expect(args[6]).not.toContain("ua-test");
    });

    it("never throws on DB failure", async () => {
        const failing = {
            prepare: vi.fn().mockReturnValue({
                bind: vi.fn().mockReturnValue({ run: vi.fn().mockRejectedValue(new Error("d1 down")) })
            })
        };
        const request = makeReq({ event: "newsletter-submit", path: "/en/" });
        const res = await trackHandler({ request, env: { INTAKE_DB: failing } });
        expect(res.status).toBe(200);
        expect((await res.json()).ok).toBe(true);
    });

    it("tolerates malformed JSON body (sendBeacon Blob)", async () => {
        const db = mockDb();
        const request = new Request("https://nexuradata.ca/api/track", {
            method: "POST",
            headers: { "content-type": "text/plain" },
            body: '{"event":"call-link","path":"/contact"}'
        });
        const res = await trackHandler({ request, env: { INTAKE_DB: db } });
        expect(res.status).toBe(200);
        expect(db.prepare).toHaveBeenCalledOnce();
    });
});
