import { HttpError } from "@/lib/http";

interface Options {
  limit: number;
  windowMs: number;
}

// Sliding-window limiter kept in process memory. This is right for a single
// Railway instance. If you scale to several replicas, move this to Redis/Mongo.
const globalForLimit = globalThis as unknown as { _waitlistRateHits?: Map<string, number[]> };
const hits = (globalForLimit._waitlistRateHits ??= new Map<string, number[]>());

export function rateLimit(key: string, { limit, windowMs }: Options): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryAfter = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }

  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map cannot grow forever.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((time) => now - time >= windowMs)) hits.delete(k);
    }
  }
  return { ok: true, retryAfter: 0 };
}

export function enforceRateLimit(key: string, options: Options, message: string): void {
  const result = rateLimit(key, options);
  if (!result.ok) {
    throw new HttpError(429, `${message} Try again in ${result.retryAfter} seconds.`, "rate_limited", {
      retryAfter: result.retryAfter,
    });
  }
}
