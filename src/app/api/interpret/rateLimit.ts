import { NextRequest } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const MAX_INSTANCE_REQUESTS = 100;
let instanceHits: number[] = [];

// In-memory and therefore per-instance: on serverless each cold instance keeps its own
// counter, and nothing is shared across regions. This is a guard on the Gemini free-tier
// quota so one noisy client cannot burn the day's requests. It is not a security boundary,
// and it is trivially bypassed by rotating IPs — do not rely on it for abuse prevention.
const hits = new Map<string, number[]>();

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

const MAX_TRACKED_KEYS = 5_000;

function pruneExpired(now: number): void {
  for (const [key, times] of hits) {
    if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
  }
}

export function checkRateLimit(req: NextRequest): RateLimitResult {
  const key = clientKey(req);
  const now = Date.now();
  instanceHits = instanceHits.filter(time => now - time < WINDOW_MS);
  if (instanceHits.length >= MAX_INSTANCE_REQUESTS) return { limited: true, retryAfterSeconds: 60 };
  if (hits.size >= MAX_TRACKED_KEYS) {
    pruneExpired(now);
    if (!hits.has(key) && hits.size >= MAX_TRACKED_KEYS) return { limited: true, retryAfterSeconds: 60 };
  }
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    const oldest = recent[0];
    return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)) };
  }

  hits.set(key, [...recent, now]);
  instanceHits.push(now);
  return { limited: false, retryAfterSeconds: 0 };
}
