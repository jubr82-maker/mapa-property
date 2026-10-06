// Limite de debit des actions serveur de l'admin (oct. 2026). Une action
// serveur n'a pas d'objet Request : la cle est le compte admin. Memoire de
// l'instance (meme principe que lib/rate-limit.ts pour les routes).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function actionRateLimit(key: string, max: number, windowMs: number, now = Date.now()): { ok: boolean; retryInSeconds: number } {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryInSeconds: 0 };
  }
  if (b.count >= max) return { ok: false, retryInSeconds: Math.ceil((b.resetAt - now) / 1000) };
  b.count += 1;
  return { ok: true, retryInSeconds: 0 };
}
