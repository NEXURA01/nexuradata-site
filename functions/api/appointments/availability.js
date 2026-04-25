// GET /api/appointments/availability?days=14
// Returns next N business days (Mon-Sat) with 6 slots/day, marking booked ones.
import { json, methodNotAllowed, onOptions } from "../../_lib/http.js";

const SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"];
const DEFAULT_DAYS = 14;

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export const onRequestOptions = () => onOptions("GET, OPTIONS");

export const onRequestGet = async (context) => {
    if (!context.env?.INTAKE_DB) {
        return json({ ok: false, message: "Service indisponible." }, { status: 503 });
    }

    const url = new URL(context.request.url);
    const days = Math.min(30, Math.max(1, Number(url.searchParams.get("days")) || DEFAULT_DAYS));

    // Build day list (skip Sundays = 0)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const out = [];
    let cursor = new Date(today);
    cursor.setUTCDate(cursor.getUTCDate() + 1); // start tomorrow
    while (out.length < days) {
        if (cursor.getUTCDay() !== 0) {
            out.push({ date: isoDate(cursor), weekday: cursor.getUTCDay(), slots: [...SLOTS] });
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Query taken slots
    const startDate = out[0].date;
    const endDate = out[out.length - 1].date;
    const { results } = await context.env.INTAKE_DB.prepare(
        "SELECT slot_date, slot_time FROM appointments WHERE slot_date BETWEEN ? AND ? AND status IN ('pending','confirmed')"
    ).bind(startDate, endDate).all();

    const taken = new Set((results || []).map((r) => `${r.slot_date}|${r.slot_time}`));

    for (const day of out) {
        day.available = day.slots.filter((s) => !taken.has(`${day.date}|${s}`));
        delete day.slots;
    }

    return json({ ok: true, days: out, durationMinutes: 60 });
};

export const onRequest = methodNotAllowed;
