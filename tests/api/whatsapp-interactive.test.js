import { describe, it, expect, vi } from "vitest";
import {
    sendWhatsAppText,
    sendWhatsAppTemplate,
    sendWhatsAppButtons,
    sendWhatsAppList
} from "../../functions/_lib/whatsapp.js";

const env = { WHATSAPP_PHONE_NUMBER_ID: "PHONE", WHATSAPP_ACCESS_TOKEN: "TOKEN" };

const okFetch = () =>
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ messages: [{ id: "wamid.X" }] }), {
            status: 200,
            headers: { "content-type": "application/json" }
        })
    );

describe("sendWhatsAppText", () => {
    it("returns not-configured without phone/token", async () => {
        const res = await sendWhatsAppText({}, "1", "hi");
        expect(res.ok).toBe(false);
        expect(res.reason).toBe("not-configured");
    });

    it("posts a text payload to graph.facebook.com", async () => {
        const spy = okFetch();
        const res = await sendWhatsAppText(env, "15145550000", "hello");
        expect(res.ok).toBe(true);
        expect(res.messageId).toBe("wamid.X");
        const body = JSON.parse(spy.mock.calls[0][1].body);
        expect(body.type).toBe("text");
        expect(body.text.body).toBe("hello");
        spy.mockRestore();
    });
});

describe("sendWhatsAppTemplate", () => {
    it("rejects when template name missing", async () => {
        const res = await sendWhatsAppTemplate(env, "1", "");
        expect(res.ok).toBe(false);
        expect(res.reason).toBe("missing-template");
    });

    it("posts template payload with language and components", async () => {
        const spy = okFetch();
        const res = await sendWhatsAppTemplate(env, "15145550000", "case_ready", "fr", [
            { type: "body", parameters: [{ type: "text", text: "NXD-1234" }] }
        ]);
        expect(res.ok).toBe(true);
        const body = JSON.parse(spy.mock.calls[0][1].body);
        expect(body.type).toBe("template");
        expect(body.template.name).toBe("case_ready");
        expect(body.template.language.code).toBe("fr");
        expect(body.template.components[0].parameters[0].text).toBe("NXD-1234");
        spy.mockRestore();
    });

    it("omits components when none provided", async () => {
        const spy = okFetch();
        await sendWhatsAppTemplate(env, "1", "hello_world", "en");
        const body = JSON.parse(spy.mock.calls[0][1].body);
        expect(body.template.components).toBeUndefined();
        spy.mockRestore();
    });
});

describe("sendWhatsAppButtons", () => {
    it("rejects when no buttons", async () => {
        const res = await sendWhatsAppButtons(env, "1", "Body", []);
        expect(res.ok).toBe(false);
    });

    it("rejects when body empty", async () => {
        const res = await sendWhatsAppButtons(env, "1", "", [{ id: "a", title: "OK" }]);
        expect(res.ok).toBe(false);
    });

    it("trims to 3 buttons and 20-char titles", async () => {
        const spy = okFetch();
        await sendWhatsAppButtons(env, "1", "Choisissez", [
            { id: "yes", title: "Oui démarrer" },
            { id: "no", title: "Non" },
            { id: "callback", title: "Rappel" },
            { id: "extra", title: "Ignored" }
        ]);
        const body = JSON.parse(spy.mock.calls[0][1].body);
        expect(body.type).toBe("interactive");
        expect(body.interactive.type).toBe("button");
        expect(body.interactive.action.buttons).toHaveLength(3);
        expect(body.interactive.action.buttons[0].reply.id).toBe("yes");
        spy.mockRestore();
    });

    it("truncates long titles to 20 chars", async () => {
        const spy = okFetch();
        await sendWhatsAppButtons(env, "1", "?", [
            { id: "x", title: "This title is way too long for WhatsApp" }
        ]);
        const body = JSON.parse(spy.mock.calls[0][1].body);
        expect(body.interactive.action.buttons[0].reply.title.length).toBeLessThanOrEqual(20);
        spy.mockRestore();
    });
});

describe("sendWhatsAppList", () => {
    it("rejects empty sections", async () => {
        const res = await sendWhatsAppList(env, "1", "Body", "Choisir", []);
        expect(res.ok).toBe(false);
    });

    it("posts a list payload with sections and rows", async () => {
        const spy = okFetch();
        await sendWhatsAppList(env, "1", "Quel support ?", "Voir options", [
            {
                title: "Stockage",
                rows: [
                    { id: "hdd", title: "Disque dur", description: "HDD interne ou externe" },
                    { id: "ssd", title: "SSD", description: "NVMe ou SATA" }
                ]
            },
            {
                title: "Mobile",
                rows: [
                    { id: "phone", title: "Téléphone" }
                ]
            }
        ]);
        const body = JSON.parse(spy.mock.calls[0][1].body);
        expect(body.type).toBe("interactive");
        expect(body.interactive.type).toBe("list");
        expect(body.interactive.action.button).toBe("Voir options");
        expect(body.interactive.action.sections).toHaveLength(2);
        expect(body.interactive.action.sections[0].rows[0].description).toContain("HDD");
        expect(body.interactive.action.sections[1].rows[0].description).toBeUndefined();
        spy.mockRestore();
    });

    it("drops sections with no rows", async () => {
        const spy = okFetch();
        const res = await sendWhatsAppList(env, "1", "?", "Go", [
            { title: "Empty", rows: [] }
        ]);
        expect(res.ok).toBe(false);
        spy.mockRestore();
    });
});
