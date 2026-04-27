import { describe, it, expect, vi } from "vitest";
import { onRequestGet, onRequestPost } from "../../functions/api/whatsapp/webhook.js";
import {
    detectLocale,
    detectIntent,
    shouldEscalate,
    verifySignature,
    sanitize
} from "../../functions/_lib/whatsapp.js";

const makeReq = (raw, headers = {}) =>
    new Request("https://nexuradata.ca/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: typeof raw === "string" ? raw : JSON.stringify(raw)
    });

const mockDb = () => {
    const calls = [];
    const exec = vi.fn().mockResolvedValue();
    const run = vi.fn().mockResolvedValue({ success: true });
    const all = vi.fn().mockResolvedValue({ results: [] });
    const first = vi.fn().mockResolvedValue(null);
    const bind = vi.fn().mockImplementation((...args) => {
        calls.push(args);
        return { run, all, first };
    });
    const prepare = vi.fn().mockReturnValue({ bind });
    return { exec, prepare, _bind: bind, _calls: calls, _run: run, _all: all, _first: first };
};

const computeSignature = async (body, secret) => {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const bytes = new Uint8Array(sig);
    let hex = "";
    for (const b of bytes) hex += b.toString(16).padStart(2, "0");
    return `sha256=${hex}`;
};

describe("whatsapp helpers", () => {
    it("detectLocale: French accents -> fr", () => {
        expect(detectLocale("Bonjour, mon disque dur fait du bruit")).toBe("fr");
        expect(detectLocale("téléphone tombé")).toBe("fr");
    });

    it("detectLocale: English keywords -> en", () => {
        expect(detectLocale("Hi, my hard drive is broken, can you recover the data?")).toBe("en");
    });

    it("detectIntent: ransomware -> escalation", () => {
        expect(detectIntent("we got hit by ransomware last night")).toBe("escalation");
        expect(detectIntent("rançongiciel")).toBe("escalation");
    });

    it("detectIntent: price keyword -> price", () => {
        expect(detectIntent("combien ça coûte ?")).toBe("price");
        expect(detectIntent("how much for an SSD?")).toBe("price");
    });

    it("shouldEscalate: keyword OR > 5 auto replies", () => {
        expect(shouldEscalate("normal question", 0)).toBe(false);
        expect(shouldEscalate("normal question", 5)).toBe(true);
        expect(shouldEscalate("avocat me poursuit", 0)).toBe(true);
    });

    it("sanitize: strips control chars and trims", () => {
        expect(sanitize("  hello\u0000world  ")).toBe("hello world");
    });
});

describe("verifySignature (HMAC-SHA256)", () => {
    it("returns true for valid signature", async () => {
        const body = '{"hello":"world"}';
        const secret = "test_secret";
        const sig = await computeSignature(body, secret);
        expect(await verifySignature(body, sig, secret)).toBe(true);
    });

    it("returns false for tampered body", async () => {
        const body = '{"hello":"world"}';
        const secret = "test_secret";
        const sig = await computeSignature(body, secret);
        expect(await verifySignature('{"hello":"WORLD"}', sig, secret)).toBe(false);
    });

    it("returns false when missing secret or signature", async () => {
        expect(await verifySignature("body", "", "secret")).toBe(false);
        expect(await verifySignature("body", "sha256=deadbeef", "")).toBe(false);
    });
});

describe("GET /api/whatsapp/webhook (verification handshake)", () => {
    it("returns hub.challenge when verify token matches", async () => {
        const url = "https://nexuradata.ca/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=tok123&hub.challenge=abc";
        const res = await onRequestGet({ request: new Request(url, { method: "GET" }), env: { WHATSAPP_VERIFY_TOKEN: "tok123" } });
        expect(res.status).toBe(200);
        expect(await res.text()).toBe("abc");
    });

    it("403 when token mismatches", async () => {
        const url = "https://nexuradata.ca/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc";
        const res = await onRequestGet({ request: new Request(url, { method: "GET" }), env: { WHATSAPP_VERIFY_TOKEN: "tok123" } });
        expect(res.status).toBe(403);
    });
});

describe("POST /api/whatsapp/webhook (signature + processing)", () => {
    it("rejects 401 with bad signature when app secret configured", async () => {
        const body = JSON.stringify({ entry: [] });
        const res = await onRequestPost({
            request: makeReq(body, { "x-hub-signature-256": "sha256=deadbeef" }),
            env: { WHATSAPP_APP_SECRET: "secret", INTAKE_DB: mockDb() }
        });
        expect(res.status).toBe(401);
    });

    it("accepts when no app secret configured (dev mode), still returns 200", async () => {
        const body = JSON.stringify({ entry: [] });
        const res = await onRequestPost({
            request: makeReq(body),
            env: { INTAKE_DB: mockDb() }
        });
        expect(res.status).toBe(200);
    });

    it("processes inbound text message: persists, calls AI, sends reply", async () => {
        const db = mockDb();
        // No prior thread, no prior messages
        db._first.mockResolvedValueOnce(null); // loadThread

        const aiRun = vi.fn().mockResolvedValue({ response: "Bonjour, quel appareil ?" });
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ messages: [{ id: "wamid.OUT1" }] }), {
                status: 200,
                headers: { "content-type": "application/json" }
            })
        );

        const payload = {
            entry: [{
                changes: [{
                    value: {
                        contacts: [{ wa_id: "15145550000", profile: { name: "Alice" } }],
                        messages: [{
                            from: "15145550000",
                            id: "wamid.IN1",
                            type: "text",
                            timestamp: "1714200000",
                            text: { body: "Bonjour, mon disque externe ne marche plus" }
                        }]
                    }
                }]
            }]
        };
        const body = JSON.stringify(payload);
        const res = await onRequestPost({
            request: makeReq(body),
            env: {
                INTAKE_DB: db,
                AI: { run: aiRun },
                WHATSAPP_PHONE_NUMBER_ID: "PHONE",
                WHATSAPP_ACCESS_TOKEN: "TOKEN"
            }
        });
        expect(res.status).toBe(200);
        expect(aiRun).toHaveBeenCalled();
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining("graph.facebook.com"),
            expect.objectContaining({ method: "POST" })
        );
        fetchSpy.mockRestore();
    });

    it("escalates on sensitive keyword without calling AI", async () => {
        const db = mockDb();
        db._first.mockResolvedValueOnce(null);

        const aiRun = vi.fn();
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ messages: [{ id: "wamid.OUT2" }] }), { status: 200 })
        );

        const payload = {
            entry: [{
                changes: [{
                    value: {
                        contacts: [{ wa_id: "15145550001", profile: { name: "Bob" } }],
                        messages: [{
                            from: "15145550001",
                            id: "wamid.IN2",
                            type: "text",
                            timestamp: "1714200001",
                            text: { body: "On a été victime de ransomware, c'est urgent" }
                        }]
                    }
                }]
            }]
        };
        const res = await onRequestPost({
            request: makeReq(JSON.stringify(payload)),
            env: {
                INTAKE_DB: db,
                AI: { run: aiRun },
                WHATSAPP_PHONE_NUMBER_ID: "PHONE",
                WHATSAPP_ACCESS_TOKEN: "TOKEN"
            }
        });
        expect(res.status).toBe(200);
        expect(aiRun).not.toHaveBeenCalled();
        expect(fetchSpy).toHaveBeenCalled();
        // Reply body must contain the human handoff phrase
        const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
        expect(sentBody.text.body.toLowerCase()).toContain("examinateur");
        fetchSpy.mockRestore();
    });
});
