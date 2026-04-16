/**
 * In-memory sliding-window rate limiter for Cloudflare Workers.
 *
 * Workers isolates share no memory, so this is per-isolate.
 * For a single-origin site this provides reasonable spam protection.
 * For stronger guarantees, layer Cloudflare WAF rate-limiting rules.
 */

const windows = new Map();
const WINDOW_MS = 60_000;   // 1-minute window
const PRUNE_INTERVAL = 300_000; // prune stale entries every 5 min
let lastPrune = Date.now();

function pruneStale() {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL) return;
  lastPrune = now;
  const cutoff = now - WINDOW_MS;
  for (const [key, timestamps] of windows) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) windows.delete(key);
    else windows.set(key, filtered);
  }
}

/**
 * Check if IP is within rate limit.
 * @param {Request} request
 * @param {number} maxRequests — max requests per WINDOW_MS
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
export function checkRateLimit(request, maxRequests = 10) {
  pruneStale();

  const ip = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";

  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const timestamps = (windows.get(ip) || []).filter(t => t > cutoff);

  if (timestamps.length >= maxRequests) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  timestamps.push(now);
  windows.set(ip, timestamps);
  return { allowed: true, remaining: maxRequests - timestamps.length, retryAfter: 0 };
}

/**
 * Return a 429 Too Many Requests response.
 * @param {number} retryAfter — seconds until next allowed request
 */
export function tooManyRequests(retryAfter) {
  return new Response(
    JSON.stringify({
      ok: false,
      message: "Trop de requêtes. Veuillez réessayer dans quelques instants."
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "retry-after": String(retryAfter),
        "cache-control": "no-store"
      }
    }
  );
}
