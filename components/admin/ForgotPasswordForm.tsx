"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-ssr";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setBusy(false);
    if (err) {
      // On affiche un succès générique côté UI pour ne pas leaker l'existence
      // d'un compte. Mais on garde l'erreur en console pour debug admin.
      console.error("[forgot-password]", err);
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Si cet email existe, un lien de récupération vient d&apos;être envoyé.
          Vérifiez votre boîte de réception (et les spams).
        </p>
        <Link
          href="/admin/login"
          className="inline-block font-mono text-xs uppercase tracking-[0.2em] text-[#e0af6e] hover:underline"
        >
          ← Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
        />
      </div>
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-[#3D4F63] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
      >
        {busy ? "Envoi…" : "Envoyer le lien de récupération"}
      </button>
      <div className="text-center">
        <Link
          href="/admin/login"
          className="font-mono text-xs uppercase tracking-[0.2em] text-[#e0af6e] hover:underline"
        >
          ← Retour à la connexion
        </Link>
      </div>
    </form>
  );
}
