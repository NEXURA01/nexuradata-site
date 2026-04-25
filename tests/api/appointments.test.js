import { describe, it, expect, vi, beforeEach } from "vitest";
import { onRequestGet as availabilityGet } from "../../functions/api/appointments/availability.js";
import { onRequestPost as bookPost } from "../../functions/api/appointments/book.js";

let reqCounter = 0;
const makeReq = (url, method = "GET", body, headers = {}) => {
    // Unique CF-Connecting-IP per request avoids tripping the in-process rate limiter
    reqCounter += 1;
    const ip = `203.0.113.${reqCounter % 250}`;
    return new Request(url, {
        method,
        headers: { "content-type": "application/json", "CF-Connecting-IP": ip, ...headers },
        body: body == null ? undefined : JSON.stringify(body),
    });
};

const makeDb = ({ allRows = { results: [] }, runResult = { meta: { changes: 1 } }, throwOnRun = false } = {}) => ({
    prepare: vi.fn(() => {
        const chain = {
            bind: vi.fn(() => chain),
            all: vi.fn(async () => allRows),
            run: vi.fn(async () => {
                if (throwOnRun) throw new Error("UNIQUE constraint failed");
                return runResult;
            }),
            first: vi.fn(async () => null),
        };
        return chain;
    }),
});

describe("GET /api/appointments/availability", () => {
    it("returns 503 when DB missing", async () => {
        const res = await availabilityGet({ env: {}, request: makeReq("https://x/api/appointments/availability") });
        expect(res.status).toBe(503);
    });

    it("returns next 14 weekdays by default with 6 slots each", async () => {
        const db = makeDb();
        const res = await availabilityGet({
            env: { INTAKE_DB: db },
            request: makeReq("https://x/api/appointments/availability"),
        });
        const j = await res.json();
        expect(j.ok).toBe(true);
        expect(j.days).toHaveLength(14);
        for (const d of j.days) {
            expect(d.weekday).not.toBe(0); // never Sunday
            expect(d.available.length).toBe(6); // none booked
        }
        expect(j.durationMinutes).toBe(60);
    });

    it("clamps days param to [1,30]", async () => {
        const db = makeDb();
        const res = await availabilityGet({
            env: { INTAKE_DB: db },
            request: makeReq("https://x/api/appointments/availability?days=999"),
        });
        const j = await res.json();
        expect(j.days).toHaveLength(30);
    });

    it("removes booked slots from availability", async () => {
        // Pick the first weekday after today (cursor starts tomorrow, skips Sunday)
        const tomorrow = new Date();
        tomorrow.setUTCHours(0, 0, 0, 0);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        if (tomorrow.getUTCDay() === 0) tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        const slot_date = tomorrow.toISOString().slice(0, 10);
        const db = makeDb({ allRows: { results: [{ slot_date, slot_time: "09:00" }, { slot_date, slot_time: "12:00" }] } });
        const res = await availabilityGet({
            env: { INTAKE_DB: db },
            request: makeReq("https://x/api/appointments/availability?days=3"),
        });
        const j = await res.json();
        const target = j.days.find((d) => d.date === slot_date);
        expect(target).toBeTruthy();
        expect(target.available).not.toContain("09:00");
        expect(target.available).not.toContain("12:00");
        expect(target.available).toContain("10:30");
    });
});

describe("POST /api/appointments/book", () => {
    let futureDate;
    beforeEach(() => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + 7);
        if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
        futureDate = d.toISOString().slice(0, 10);
    });

    it("returns 503 when DB missing", async () => {
        const res = await bookPost({
            env: {},
            request: makeReq("https://x/api/appointments/book", "POST", { slotDate: futureDate, slotTime: "10:30", name: "Alice", email: "a@b.co" }),
        });
        expect(res.status).toBe(503);
    });

    it("rejects invalid date format", async () => {
        const res = await bookPost({
            env: { INTAKE_DB: makeDb() },
            request: makeReq("https://x/api/appointments/book", "POST", { slotDate: "bad", slotTime: "10:30", name: "Alice", email: "a@b.co" }),
        });
        expect(res.status).toBe(400);
    });

    it("rejects invalid slot time", async () => {
        const res = await bookPost({
            env: { INTAKE_DB: makeDb() },
            request: makeReq("https://x/api/appointments/book", "POST", { slotDate: futureDate, slotTime: "07:00", name: "Alice", email: "a@b.co" }),
        });
        expect(res.status).toBe(400);
    });

    it("rejects missing name", async () => {
        const res = await bookPost({
            env: { INTAKE_DB: makeDb() },
            request: makeReq("https://x/api/appointments/book", "POST", { slotDate: futureDate, slotTime: "10:30", name: "", email: "a@b.co" }),
        });
        expect(res.status).toBe(400);
    });

    it("rejects invalid email", async () => {
        const res = await bookPost({
            env: { INTAKE_DB: makeDb() },
            request: makeReq("https://x/api/appointments/book", "POST", { slotDate: futureDate, slotTime: "10:30", name: "Alice", email: "bad" }),
        });
        expect(res.status).toBe(400);
    });

    it("rejects past slot", async () => {
        const past = new Date();
        past.setUTCDate(past.getUTCDate() - 5);
        const pastDate = past.toISOString().slice(0, 10);
        const res = await bookPost({
            env: { INTAKE_DB: makeDb() },
            request: makeReq("https://x/api/appointments/book", "POST", { slotDate: pastDate, slotTime: "10:30", name: "Alice", email: "a@b.co" }),
        });
        expect(res.status).toBe(400);
    });

    it("silently drops honeypot submission", async () => {
        const res = await bookPost({
            env: { INTAKE_DB: makeDb() },
            request: makeReq("https://x/api/appointments/book", "POST", { website: "spam", slotDate: futureDate, slotTime: "10:30", name: "Alice", email: "a@b.co" }),
        });
        expect(res.status).toBe(200);
        const j = await res.json();
        expect(j.ref).toBe("RDV-XXXXXXXX");
    });

    it("books a valid slot and returns ref", async () => {
        const db = makeDb();
        const res = await bookPost({
            env: { INTAKE_DB: db },
            request: makeReq("https://x/api/appointments/book", "POST", {
                slotDate: futureDate, slotTime: "13:30", name: "Alice Test", email: "alice@example.ca", phone: "5145550000", locale: "fr"
            }),
        });
        const j = await res.json();
        expect(res.status).toBe(200);
        expect(j.ok).toBe(true);
        expect(j.ref).toMatch(/^RDV-[A-Z0-9]{8}$/);
        expect(j.slotDate).toBe(futureDate);
        expect(j.slotTime).toBe("13:30");
    });

    it("returns 409 when slot already booked (UNIQUE conflict)", async () => {
        const db = makeDb({ throwOnRun: true });
        const res = await bookPost({
            env: { INTAKE_DB: db },
            request: makeReq("https://x/api/appointments/book", "POST", {
                slotDate: futureDate, slotTime: "10:30", name: "Alice", email: "a@b.co"
            }),
        });
        expect(res.status).toBe(409);
        const j = await res.json();
        expect(j.conflict).toBe(true);
    });
});
