import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, tooManyRequests } from "../../functions/_lib/rate-limit.js";

function mockRequest(ip = "1.2.3.4") {
  return {
    headers: new Map([["cf-connecting-ip", ip]])
  };
}

// Reset the internal state between tests by importing fresh
describe("rate-limit", () => {
  describe("checkRateLimit", () => {
    it("allows first request", () => {
      const req = mockRequest("10.0.0.1");
      const result = checkRateLimit(req, 5);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.retryAfter).toBe(0);
    });

    it("allows requests up to the limit", () => {
      const ip = "10.0.0.2";
      for (let i = 0; i < 9; i++) {
        checkRateLimit(mockRequest(ip), 10);
      }
      const result = checkRateLimit(mockRequest(ip), 10);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it("blocks requests over the limit", () => {
      const ip = "10.0.0.3";
      for (let i = 0; i < 3; i++) {
        checkRateLimit(mockRequest(ip), 3);
      }
      const result = checkRateLimit(mockRequest(ip), 3);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("tracks IPs independently", () => {
      const ipA = "10.0.0.4";
      const ipB = "10.0.0.5";
      // exhaust ipA
      for (let i = 0; i < 2; i++) checkRateLimit(mockRequest(ipA), 2);
      const resultA = checkRateLimit(mockRequest(ipA), 2);
      expect(resultA.allowed).toBe(false);

      // ipB should still be allowed
      const resultB = checkRateLimit(mockRequest(ipB), 2);
      expect(resultB.allowed).toBe(true);
    });

    it("falls back to x-forwarded-for when cf-connecting-ip is absent", () => {
      const req = {
        headers: new Map([["x-forwarded-for", "192.168.1.1, 10.0.0.1"]])
      };
      const result = checkRateLimit(req, 5);
      expect(result.allowed).toBe(true);
    });

    it("handles missing IP headers gracefully", () => {
      const req = { headers: new Map() };
      const result = checkRateLimit(req, 100);
      expect(result.allowed).toBe(true);
    });
  });

  describe("tooManyRequests", () => {
    it("returns 429 response with retry-after header", async () => {
      const response = tooManyRequests(30);
      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("30");
      expect(response.headers.get("content-type")).toContain("application/json");

      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.message).toBeTruthy();
    });

    it("returns cache-control no-store", () => {
      const response = tooManyRequests(60);
      expect(response.headers.get("cache-control")).toBe("no-store");
    });
  });
});
