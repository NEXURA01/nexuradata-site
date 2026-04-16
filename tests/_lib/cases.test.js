import { describe, it, expect } from "vitest";
import {
  normalizeText,
  normalizeMultilineText,
  validateSubmission,
  validateStatusLookup,
  generateCaseId,
  generateAccessCode,
  normalizeCaseId,
  normalizeAccessCode,
  hashAccessCode,
  encryptAccessCode,
  decryptAccessCode,
  validateTimelineSteps,
  validatePaymentRequestInput,
  getPublicOrigin,
  authorizeOpsRequest
} from "../../functions/_lib/cases.js";

// ─── normalizeText ──────────────────────────────────────────

describe("normalizeText()", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeText("  hello   world  ", 100)).toBe("hello world");
  });

  it("truncates to maxLength", () => {
    expect(normalizeText("abcdef", 3)).toBe("abc");
  });

  it("returns empty string for non-string input", () => {
    expect(normalizeText(null, 10)).toBe("");
    expect(normalizeText(undefined, 10)).toBe("");
    expect(normalizeText(42, 10)).toBe("");
    expect(normalizeText(true, 10)).toBe("");
  });

  it("handles empty string", () => {
    expect(normalizeText("", 100)).toBe("");
  });

  it("handles tabs and newlines as whitespace", () => {
    expect(normalizeText("a\t\nb", 100)).toBe("a b");
  });
});

// ─── normalizeMultilineText ─────────────────────────────────

describe("normalizeMultilineText()", () => {
  it("trims and normalises line endings", () => {
    expect(normalizeMultilineText("  hello\r\nworld  ", 100)).toBe("hello\nworld");
  });

  it("collapses 3+ consecutive newlines to 2", () => {
    expect(normalizeMultilineText("a\n\n\n\nb", 100)).toBe("a\n\nb");
  });

  it("truncates to maxLength", () => {
    expect(normalizeMultilineText("abcdef", 3)).toBe("abc");
  });

  it("returns empty for non-string", () => {
    expect(normalizeMultilineText(123, 10)).toBe("");
    expect(normalizeMultilineText(null, 10)).toBe("");
  });
});

// ─── generateCaseId ─────────────────────────────────────────

describe("generateCaseId()", () => {
  it("starts with NX-", () => {
    expect(generateCaseId()).toMatch(/^NX-/);
  });

  it("contains date segment in YYYYMMDD format", () => {
    const id = generateCaseId();
    const dateStr = id.split("-").slice(1, 2).join("");
    expect(dateStr).toMatch(/^\d{8}$/);
  });

  it("produces unique IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateCaseId()));
    expect(ids.size).toBe(50);
  });

  it("has correct format NX-YYYYMMDD-XXXXXXXX", () => {
    expect(generateCaseId()).toMatch(/^NX-\d{8}-[A-Z0-9]{8}$/);
  });
});

// ─── generateAccessCode ────────────────────────────────────

describe("generateAccessCode()", () => {
  it("matches XXXX-XXXX pattern", () => {
    expect(generateAccessCode()).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("produces unique codes", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateAccessCode()));
    expect(codes.size).toBe(50);
  });

  it("excludes confusing characters (0, 1, O, I)", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateAccessCode();
      expect(code).not.toMatch(/[01OI]/);
    }
  });
});

// ─── normalizeCaseId / normalizeAccessCode ──────────────────

describe("normalizeCaseId()", () => {
  it("uppercases and strips invalid characters", () => {
    expect(normalizeCaseId("nx-20260101-abcd1234")).toBe("NX-20260101-ABCD1234");
  });

  it("strips special characters", () => {
    expect(normalizeCaseId("NX-2026!@#$%")).toBe("NX-2026");
  });

  it("returns empty for non-string", () => {
    expect(normalizeCaseId(null)).toBe("");
  });
});

describe("normalizeAccessCode()", () => {
  it("uppercases input", () => {
    expect(normalizeAccessCode("abcd-efgh")).toBe("ABCD-EFGH");
  });

  it("strips invalid characters", () => {
    expect(normalizeAccessCode("AB!CD")).toBe("ABCD");
  });
});

// ─── hashAccessCode ────────────────────────────────────────

describe("hashAccessCode()", () => {
  const env = { ACCESS_CODE_SECRET: "test-secret-key" };

  it("returns a hex string", async () => {
    const hash = await hashAccessCode("ABCD-EFGH", env);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for same input", async () => {
    const h1 = await hashAccessCode("ABCD-EFGH", env);
    const h2 = await hashAccessCode("ABCD-EFGH", env);
    expect(h1).toBe(h2);
  });

  it("differs for different access codes", async () => {
    const h1 = await hashAccessCode("ABCD-EFGH", env);
    const h2 = await hashAccessCode("WXYZ-1234", env);
    expect(h1).not.toBe(h2);
  });

  it("differs with different secrets", async () => {
    const h1 = await hashAccessCode("ABCD-EFGH", env);
    const h2 = await hashAccessCode("ABCD-EFGH", { ACCESS_CODE_SECRET: "other-secret" });
    expect(h1).not.toBe(h2);
  });
});

// ─── encryptAccessCode / decryptAccessCode ──────────────────

describe("encrypt / decrypt access code", () => {
  const env = { ACCESS_CODE_SECRET: "test-secret-key-for-aes" };

  it("round-trips correctly", async () => {
    const original = "ABCD-EFGH";
    const encrypted = await encryptAccessCode(original, env);
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(original);

    const decrypted = await decryptAccessCode(encrypted, env);
    expect(decrypted).toBe(original);
  });

  it("returns empty string when secret is missing (encrypt)", async () => {
    const result = await encryptAccessCode("ABCD-EFGH", {});
    expect(result).toBe("");
  });

  it("returns empty string when secret is missing (decrypt)", async () => {
    const result = await decryptAccessCode("something.encrypted", {});
    expect(result).toBe("");
  });

  it("returns empty string for empty ciphertext", async () => {
    const result = await decryptAccessCode("", env);
    expect(result).toBe("");
  });

  it("returns empty string for malformed ciphertext", async () => {
    const result = await decryptAccessCode("not-valid", env);
    expect(result).toBe("");
  });

  it("produces different ciphertext each time (random IV)", async () => {
    const e1 = await encryptAccessCode("TEST-CODE", env);
    const e2 = await encryptAccessCode("TEST-CODE", env);
    expect(e1).not.toBe(e2);
  });

  it("decryption fails with wrong secret", async () => {
    const encrypted = await encryptAccessCode("ABCD-EFGH", env);
    const result = await decryptAccessCode(encrypted, { ACCESS_CODE_SECRET: "wrong-key" });
    expect(result).toBe("");
  });
});

// ─── validateSubmission ────────────────────────────────────

describe("validateSubmission()", () => {
  const validPayload = {
    nom: "Jean Dupont",
    courriel: "jean@example.com",
    telephone: "514-555-0100",
    support: "Disque dur",
    urgence: "Standard",
    message: "Mon disque ne démarre plus.",
    consentement: true
  };

  it("accepts valid submission", () => {
    const result = validateSubmission(validPayload);
    expect(result.nom).toBe("Jean Dupont");
    expect(result.courriel).toBe("jean@example.com");
    expect(result.support).toBe("Disque dur");
    expect(result.urgence).toBe("Standard");
    expect(result.sourcePath).toBe("/");
  });

  it("normalises email to lowercase", () => {
    const result = validateSubmission({ ...validPayload, courriel: "Jean@Example.COM" });
    expect(result.courriel).toBe("jean@example.com");
  });

  it("rejects honeypot-filled submissions", () => {
    expect(() => validateSubmission({ ...validPayload, website: "spam" })).toThrow("Requête rejetée.");
  });

  it("rejects missing required fields", () => {
    expect(() => validateSubmission({ ...validPayload, nom: "" })).toThrow("Complétez tous les champs requis.");
    expect(() => validateSubmission({ ...validPayload, courriel: "" })).toThrow("Complétez tous les champs requis.");
    expect(() => validateSubmission({ ...validPayload, message: "" })).toThrow("Complétez tous les champs requis.");
    expect(() => validateSubmission({ ...validPayload, consentement: false })).toThrow("Complétez tous les champs requis.");
  });

  it("rejects invalid email", () => {
    expect(() => validateSubmission({ ...validPayload, courriel: "not-an-email" })).toThrow("Adresse courriel invalide.");
  });

  it("rejects invalid support type", () => {
    expect(() => validateSubmission({ ...validPayload, support: "Unknown" })).toThrow("Support invalide.");
  });

  it("rejects invalid urgency level", () => {
    expect(() => validateSubmission({ ...validPayload, urgence: "Extreme" })).toThrow("Niveau d'urgence invalide.");
  });

  it("accepts consentement as 'true' string", () => {
    const result = validateSubmission({ ...validPayload, consentement: "true" });
    expect(result.nom).toBe("Jean Dupont");
  });

  it("accepts consentement as 'on'", () => {
    const result = validateSubmission({ ...validPayload, consentement: "on" });
    expect(result.nom).toBeTruthy();
  });

  it("accepts all valid support types", () => {
    const supports = ["Disque dur", "SSD", "RAID / NAS / serveur", "Téléphone / mobile", "USB / carte mémoire", "Je ne sais pas"];
    for (const support of supports) {
      const result = validateSubmission({ ...validPayload, support });
      expect(result.support).toBe(support);
    }
  });

  it("accepts all valid urgency levels", () => {
    const urgencies = ["Standard", "Rapide", "Urgent", "Très sensible"];
    for (const urgence of urgencies) {
      const result = validateSubmission({ ...validPayload, urgence });
      expect(result.urgence).toBe(urgence);
    }
  });

  it("trims and normalises whitespace in name", () => {
    const result = validateSubmission({ ...validPayload, nom: "  Jean   Dupont  " });
    expect(result.nom).toBe("Jean Dupont");
  });

  it("preserves sourcePath when provided", () => {
    const result = validateSubmission({ ...validPayload, sourcePath: "/services" });
    expect(result.sourcePath).toBe("/services");
  });
});

// ─── validateStatusLookup ──────────────────────────────────

describe("validateStatusLookup()", () => {
  it("normalises and returns caseId and accessCode", () => {
    const result = validateStatusLookup({ caseId: "nx-20260101-abcd1234", accessCode: "abcd-efgh" });
    expect(result.caseId).toBe("NX-20260101-ABCD1234");
    expect(result.accessCode).toBe("ABCD-EFGH");
  });

  it("accepts alternate field names (dossier, code)", () => {
    const result = validateStatusLookup({ dossier: "NX-20260101-ABCD1234", code: "ABCD-EFGH" });
    expect(result.caseId).toBe("NX-20260101-ABCD1234");
    expect(result.accessCode).toBe("ABCD-EFGH");
  });

  it("throws when caseId is missing", () => {
    expect(() => validateStatusLookup({ accessCode: "ABCD-EFGH" })).toThrow("numéro de dossier");
  });

  it("throws when accessCode is missing", () => {
    expect(() => validateStatusLookup({ caseId: "NX-20260101-ABCD1234" })).toThrow("numéro de dossier");
  });

  it("throws when both are empty", () => {
    expect(() => validateStatusLookup({})).toThrow();
  });
});

// ─── validateTimelineSteps ──────────────────────────────────

describe("validateTimelineSteps()", () => {
  const validStep = { title: "Step 1", note: "Note for step", state: "pending" };

  it("returns null for undefined steps", () => {
    expect(validateTimelineSteps(undefined)).toBeNull();
  });

  it("validates valid steps", () => {
    const result = validateTimelineSteps([validStep]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Step 1");
    expect(result[0].state).toBe("pending");
    expect(result[0].sortOrder).toBe(0);
  });

  it("rejects empty array", () => {
    expect(() => validateTimelineSteps([])).toThrow("entre 1 et 8 étapes");
  });

  it("rejects more than 8 steps", () => {
    const steps = Array.from({ length: 9 }, (_, i) => ({ title: `Step ${i}`, note: "Note", state: "pending" }));
    expect(() => validateTimelineSteps(steps)).toThrow("entre 1 et 8 étapes");
  });

  it("rejects non-array", () => {
    expect(() => validateTimelineSteps("steps")).toThrow("entre 1 et 8 étapes");
  });

  it("rejects invalid state", () => {
    expect(() => validateTimelineSteps([{ title: "Step", note: "Note", state: "invalid" }])).toThrow("Étape invalide");
  });

  it("rejects step with missing title", () => {
    expect(() => validateTimelineSteps([{ title: "", note: "Note", state: "pending" }])).toThrow("Étape invalide");
  });

  it("rejects step with missing note", () => {
    expect(() => validateTimelineSteps([{ title: "Step", note: "", state: "active" }])).toThrow("Étape invalide");
  });

  it("accepts all valid states", () => {
    const states = ["pending", "active", "complete"];
    for (const state of states) {
      const result = validateTimelineSteps([{ title: "T", note: "N", state }]);
      expect(result[0].state).toBe(state);
    }
  });

  it("assigns sequential sortOrder", () => {
    const steps = [
      { title: "A", note: "NA", state: "complete" },
      { title: "B", note: "NB", state: "active" },
      { title: "C", note: "NC", state: "pending" }
    ];
    const result = validateTimelineSteps(steps);
    expect(result[0].sortOrder).toBe(0);
    expect(result[1].sortOrder).toBe(1);
    expect(result[2].sortOrder).toBe(2);
  });
});

// ─── validatePaymentRequestInput ────────────────────────────

describe("validatePaymentRequestInput()", () => {
  const validPayload = {
    caseId: "NX-20260101-ABCD1234",
    paymentKind: "deposit",
    label: "Dépôt initial",
    description: "Dépôt pour l'évaluation",
    amount: "150.00",
    currency: "cad"
  };

  it("accepts valid payment request", () => {
    const result = validatePaymentRequestInput(validPayload);
    expect(result.caseId).toBe("NX-20260101-ABCD1234");
    expect(result.paymentKind).toBe("deposit");
    expect(result.amountCents).toBe(15000);
    expect(result.currency).toBe("cad");
  });

  it("rejects missing caseId", () => {
    expect(() => validatePaymentRequestInput({ ...validPayload, caseId: "" })).toThrow("Numéro de dossier invalide.");
  });

  it("rejects invalid payment kind", () => {
    expect(() => validatePaymentRequestInput({ ...validPayload, paymentKind: "monthly" })).toThrow("Type de paiement invalide.");
  });

  it("rejects missing label", () => {
    expect(() => validatePaymentRequestInput({ ...validPayload, label: "" })).toThrow("Ajoutez un libellé");
  });

  it("rejects missing description", () => {
    expect(() => validatePaymentRequestInput({ ...validPayload, description: "" })).toThrow("Ajoutez une description");
  });

  it("converts comma decimal to cents correctly", () => {
    const result = validatePaymentRequestInput({ ...validPayload, amount: "250,50" });
    expect(result.amountCents).toBe(25050);
  });

  it("rejects amount below $1.00", () => {
    expect(() => validatePaymentRequestInput({ ...validPayload, amount: "0.50" })).toThrow("Montant hors limites.");
  });

  it("rejects negative amount", () => {
    expect(() => validatePaymentRequestInput({ ...validPayload, amount: "-10" })).toThrow("Montant invalide.");
  });

  it("rejects non-numeric amount", () => {
    expect(() => validatePaymentRequestInput({ ...validPayload, amount: "abc" })).toThrow("Montant invalide.");
  });

  it("accepts all valid payment kinds", () => {
    for (const kind of ["deposit", "final", "custom"]) {
      const result = validatePaymentRequestInput({ ...validPayload, paymentKind: kind });
      expect(result.paymentKind).toBe(kind);
    }
  });

  it("defaults currency to cad", () => {
    const result = validatePaymentRequestInput({ ...validPayload, currency: undefined });
    expect(result.currency).toBe("cad");
  });

  it("defaults paymentKind to custom when not specified", () => {
    const { paymentKind: _, ...rest } = validPayload;
    const result = validatePaymentRequestInput(rest);
    expect(result.paymentKind).toBe("custom");
  });
});

// ─── getPublicOrigin ────────────────────────────────────────

describe("getPublicOrigin()", () => {
  it("returns configured origin from env", () => {
    const env = { PUBLIC_SITE_ORIGIN: "https://nexuradata.ca/" };
    expect(getPublicOrigin(env, "https://example.com/api")).toBe("https://nexuradata.ca");
  });

  it("strips trailing slashes from configured origin", () => {
    const env = { PUBLIC_SITE_ORIGIN: "https://nexuradata.ca///" };
    expect(getPublicOrigin(env, "https://example.com/")).toBe("https://nexuradata.ca");
  });

  it("falls back to request URL origin", () => {
    expect(getPublicOrigin({}, "https://staging.nexuradata.ca/api/intake")).toBe("https://staging.nexuradata.ca");
  });

  it("handles missing env gracefully", () => {
    expect(getPublicOrigin(null, "https://nexuradata.ca/api")).toBe("https://nexuradata.ca");
  });
});

// ─── authorizeOpsRequest ────────────────────────────────────

describe("authorizeOpsRequest()", () => {
  const makeRequest = (url, email = "") => {
    const headers = new Headers();
    if (email) headers.set("Cf-Access-Authenticated-User-Email", email);
    return new Request(url, { headers });
  };

  it("allows localhost without email", () => {
    const result = authorizeOpsRequest(makeRequest("http://localhost/api/ops/cases"), {});
    expect(result.ok).toBe(true);
    expect(result.actor).toBe("local-dev");
  });

  it("allows localhost with email", () => {
    const result = authorizeOpsRequest(makeRequest("http://localhost/api", "admin@nexuradata.ca"), {});
    expect(result.ok).toBe(true);
    expect(result.actor).toBe("admin@nexuradata.ca");
  });

  it("allows 127.0.0.1", () => {
    const result = authorizeOpsRequest(makeRequest("http://127.0.0.1/api"), {});
    expect(result.ok).toBe(true);
  });

  it("allows configured email", () => {
    const env = { OPS_ACCESS_ALLOWED_EMAILS: "admin@nexuradata.ca, tech@nexuradata.ca" };
    const req = makeRequest("https://nexuradata.ca/api/ops/cases", "admin@nexuradata.ca");
    const result = authorizeOpsRequest(req, env);
    expect(result.ok).toBe(true);
    expect(result.actor).toBe("admin@nexuradata.ca");
  });

  it("allows email matching domain", () => {
    const env = { OPS_ACCESS_ALLOWED_DOMAIN: "nexuradata.ca" };
    const req = makeRequest("https://nexuradata.ca/api/ops/cases", "user@nexuradata.ca");
    const result = authorizeOpsRequest(req, env);
    expect(result.ok).toBe(true);
  });

  it("rejects email not matching allowed list or domain", () => {
    const env = { OPS_ACCESS_ALLOWED_EMAILS: "admin@nexuradata.ca" };
    const req = makeRequest("https://nexuradata.ca/api/ops/cases", "hacker@evil.com");
    const result = authorizeOpsRequest(req, env);
    expect(result.ok).toBe(false);
  });

  it("rejects when no email header is present (non-local)", () => {
    const env = { OPS_ACCESS_ALLOWED_EMAILS: "admin@nexuradata.ca" };
    const req = makeRequest("https://nexuradata.ca/api/ops/cases");
    const result = authorizeOpsRequest(req, env);
    expect(result.ok).toBe(false);
  });

  it("rejects when no allowed emails or domain configured", () => {
    const req = makeRequest("https://nexuradata.ca/api/ops/cases", "user@nexuradata.ca");
    const result = authorizeOpsRequest(req, {});
    expect(result.ok).toBe(false);
  });

  it("is case-insensitive for email comparison", () => {
    const env = { OPS_ACCESS_ALLOWED_EMAILS: "Admin@Nexuradata.ca" };
    const req = makeRequest("https://nexuradata.ca/api/ops/cases", "admin@nexuradata.ca");
    const result = authorizeOpsRequest(req, env);
    expect(result.ok).toBe(true);
  });
});
