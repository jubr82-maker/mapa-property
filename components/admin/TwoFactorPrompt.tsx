"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-ssr";

type Factor = { id: string; friendly_name?: string | null };

export function TwoFactorPrompt({ onSuccess }: { onSuccess: () => void }) {
  const [factor, setFactor] = useState<Factor | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error: err } = await supabase.auth.mfa.listFactors();
      if (err) {
        setError(err.message);
        return;
      }
      const totp = data.totp?.[0];
      if (!totp) {
        setError("Aucun facteur 2FA TOTP configuré pour ce compte.");
        return;
      }
      setFactor({ id: totp.id, friendly_name: totp.friendly_name });
    };
    void load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factor) return;
    setError(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challenge.error) {
      setError(challenge.error.message);
      setBusy(false);
      return;
    }
    const verify = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.data.id,
      code,
    });
    setBusy(false);
    if (verify.error) {
      setError(verify.error.message);
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B8865A]">
          Étape 2 / 2
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-[#3D4F63]">
          Vérification 2FA
        </h2>
        <p className="mt-2 text-sm text-[#3D4F63]/70">
          Saisissez le code à 6 chiffres généré par votre application
          d&apos;authentification.
        </p>
      </div>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="123456"
        className="block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] text-[#1A1F2A] focus:border-[#B8865A] focus:outline-none"
      />
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="w-full rounded-md bg-[#3D4F63] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#B8865A] disabled:opacity-50"
      >
        {busy ? "Vérification…" : "Valider"}
      </button>
    </form>
  );
}
