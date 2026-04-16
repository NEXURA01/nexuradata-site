import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendLabNotificationEmail, sendClientAccessEmail, sendClientStatusEmail } from "../../functions/_lib/email.js";

// ─── sendLabNotificationEmail ───────────────────────────────

describe("sendLabNotificationEmail()", () => {
  it("returns missing-lab-inbox when LAB_INBOX_EMAIL is not set", async () => {
    const result = await sendLabNotificationEmail({}, { caseId: "NX-1", support: "SSD", urgence: "Standard" }, "https://nexuradata.ca/api");
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("missing-lab-inbox");
  });

  it("returns not-configured when RESEND_API_KEY is absent", async () => {
    const env = { LAB_INBOX_EMAIL: "lab@test.com" };
    const record = {
      caseId: "NX-TEST-001",
      support: "SSD",
      urgence: "Standard",
      nom: "Jean",
      courriel: "jean@test.com",
      telephone: "514-555-0100",
      accessCode: "ABCD-1234",
      sourcePath: "/",
      message: "Disk failure"
    };
    const result = await sendLabNotificationEmail(env, record, "https://nexuradata.ca/api");
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("not-configured");
  });

  it("calls Resend API with correct payload when configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email-id-123" }), { status: 200 })
    );

    const env = {
      LAB_INBOX_EMAIL: "lab@test.com",
      RESEND_API_KEY: "re_test_key",
      RESEND_FROM_EMAIL: "noreply@nexuradata.ca"
    };
    const record = {
      caseId: "NX-20260101-ABCD1234",
      support: "Disque dur",
      urgence: "Standard",
      nom: "Jean Dupont",
      courriel: "jean@test.com",
      telephone: "514-555-0100",
      accessCode: "ABCD-EFGH",
      sourcePath: "/",
      message: "Mon disque ne fonctionne plus."
    };

    const result = await sendLabNotificationEmail(env, record, "https://nexuradata.ca/api");
    expect(result.sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer re_test_key");

    const body = JSON.parse(options.body);
    expect(body.to).toEqual(["lab@test.com"]);
    expect(body.subject).toContain("NX-20260101-ABCD1234");
    expect(body.from).toBe("noreply@nexuradata.ca");

    fetchSpy.mockRestore();
  });
});

// ─── sendClientAccessEmail ──────────────────────────────────

describe("sendClientAccessEmail()", () => {
  it("returns not-configured when RESEND is not set up", async () => {
    const record = {
      caseId: "NX-TEST-002",
      accessCode: "WXYZ-1234",
      email: "client@test.com",
      name: "Marie",
      status: "Dossier reçu",
      nextStep: "Évaluation"
    };
    const result = await sendClientAccessEmail({}, record, "https://nexuradata.ca/api");
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("not-configured");
  });

  it("sends email with correct subject for initial reason", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email-456" }), { status: 200 })
    );

    const env = {
      RESEND_API_KEY: "re_test_key",
      RESEND_FROM_EMAIL: "noreply@nexuradata.ca",
      INTAKE_DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({ run: vi.fn() })
        })
      }
    };
    const record = {
      caseId: "NX-20260101-A1B2C3D4",
      accessCode: "TEST-CODE",
      email: "client@test.com",
      name: "Marie",
      status: "Dossier reçu",
      nextStep: "Évaluation"
    };

    const result = await sendClientAccessEmail(env, record, "https://nexuradata.ca/api", "initial");
    expect(result.sent).toBe(true);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.subject).toContain("Dossier");
    expect(body.subject).toContain("NX-20260101-A1B2C3D4");
    expect(body.to).toEqual(["client@test.com"]);

    fetchSpy.mockRestore();
  });

  it("sends with regenerated subject", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email-789" }), { status: 200 })
    );

    const env = {
      RESEND_API_KEY: "re_key",
      RESEND_FROM_EMAIL: "no-reply@nexuradata.ca",
      INTAKE_DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({ run: vi.fn() })
        })
      }
    };
    const record = {
      caseId: "NX-20260101-REGEN123",
      accessCode: "REGEN-CODE",
      email: "user@test.com",
      name: "Paul",
      status: "En cours",
      nextStep: "Lecture"
    };

    await sendClientAccessEmail(env, record, "https://nexuradata.ca/api", "regenerated");

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.subject).toContain("Nouveau code d'accès");

    fetchSpy.mockRestore();
  });
});
