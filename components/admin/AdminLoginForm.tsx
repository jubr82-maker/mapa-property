"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-ssr";
import { TwoFactorPrompt } from "@/components/admin/TwoFactorPrompt";

export function AdminLoginForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ from?: string; error?: string }>;
}) {
  const searchParams = use(searchParamsPromise);
  const from = searchParams.from ?? "/admin";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    // Vérifier si un facteur 2FA est requis avant l'accès admin.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      setMfaRequired(true);
      setBusy(false);
      return;
    }
    router.replace(from);
    router.refresh();
  };

  if (mfaRequired) {
    return (
      <TwoFactorPrompt
        onSuccess={() => {
          router.replace(from);
          router.refresh();
        }}
      />
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
          className="mt-1 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70"
        >
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm text-[#1A1F2A] focus:border-[#e0af6e] focus:outline-none"
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
        {busy ? "Connexion…" : "Se connecter"}
      </button>
      <div className="text-center">
        <Link
          href="/admin/forgot-password"
          className="font-mono text-xs uppercase tracking-[0.2em] text-[#e0af6e] hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>
    </form>
  );
}
