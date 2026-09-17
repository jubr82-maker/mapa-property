export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  console.error("[DIAG-CONTACT] verifyTurnstile: secret", { // DIAG-CONTACT TEMPORAIRE A RETIRER
    present: Boolean(secret), // DIAG-CONTACT TEMPORAIRE A RETIRER
    length: secret?.length ?? 0, // DIAG-CONTACT TEMPORAIRE A RETIRER
    prefix4: secret ? secret.slice(0, 4) : null, // DIAG-CONTACT TEMPORAIRE A RETIRER
    hasWhitespace: secret ? /\s/.test(secret) : false, // DIAG-CONTACT TEMPORAIRE A RETIRER
  }); // DIAG-CONTACT TEMPORAIRE A RETIRER
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] TURNSTILE_SECRET_KEY missing");
      return false;
    }
    return true;
  }
  console.error("[DIAG-CONTACT] verifyTurnstile: token", { // DIAG-CONTACT TEMPORAIRE A RETIRER
    present: Boolean(token), // DIAG-CONTACT TEMPORAIRE A RETIRER
    length: token?.length ?? 0, // DIAG-CONTACT TEMPORAIRE A RETIRER
  }); // DIAG-CONTACT TEMPORAIRE A RETIRER
  if (!token) return false;
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
      hostname?: string;
      action?: string;
    };
    console.error("[DIAG-CONTACT] verifyTurnstile: siteverify response", { // DIAG-CONTACT TEMPORAIRE A RETIRER
      success: data.success, // DIAG-CONTACT TEMPORAIRE A RETIRER
      errorCodes: data["error-codes"], // DIAG-CONTACT TEMPORAIRE A RETIRER
      hostname: data.hostname, // DIAG-CONTACT TEMPORAIRE A RETIRER
      action: data.action, // DIAG-CONTACT TEMPORAIRE A RETIRER
    }); // DIAG-CONTACT TEMPORAIRE A RETIRER
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
