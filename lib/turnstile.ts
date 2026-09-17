export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] TURNSTILE_SECRET_KEY missing");
      return false;
    }
    return true;
  }
  if (!token) {
    // DEBUG TEMPORAIRE — voir conversation "bug Turnstile 300010".
    console.error("[turnstile][debug] no token received from client (widget never produced one)");
    return false;
  }
  try {
    const formData = new URLSearchParams({ secret, response: token });
    if (ip) formData.append("remoteip", ip);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      },
    );
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    // DEBUG TEMPORAIRE — voir conversation "bug Turnstile 300010".
    console.error("[turnstile][debug] siteverify response", {
      success: data.success,
      errorCodes: data["error-codes"],
    });
    return Boolean(data.success);
  } catch (err) {
    console.error("[turnstile] verify failed", err);
    return false;
  }
}

export function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || undefined;
  const real = req.headers.get("x-real-ip");
  return real?.trim() || undefined;
}
