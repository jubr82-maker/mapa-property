// Rate limiter in-memory pour les API routes sensibles.
// Suffisant pour MVP. Pour production sérieuse, utiliser Upstash Redis ou
// laisser Cloudflare Rate Limiting Rules s'en charger côté edge.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const getKey = (req: Request, namespace: string): string => {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : "unknown";
  return `${namespace}:${ip}`;
};

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  namespace: string;
}

export const rateLimit = (
  req: Request,
  { windowMs, max, namespace }: RateLimitOptions,
): { ok: boolean; remaining: number; resetIn: number } => {
  const key = getKey(req, namespace);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetIn: windowMs };
  }

  if (bucket.count >= max) {
    return { ok: false, remaining: 0, resetIn: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true, remaining: max - bucket.count, resetIn: bucket.resetAt - now };
};

// Light janitor — purge les vieux buckets toutes les minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 60_000).unref?.();
}
