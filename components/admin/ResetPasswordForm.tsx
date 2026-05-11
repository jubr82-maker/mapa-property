"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-ssr";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace("/admin?reset=1");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70"
        >
          Nouveau mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#B8865A] focus:outline-none"
        />
      </div>
      <div>
        <label
          htmlFor="confirm"
          className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70"
        >
          Confirmer
        </label>
        <input
          id="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#B8865A] focus:outline-none"
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
        className="w-full rounded-md bg-[#3D4F63] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#B8865A] disabled:opacity-50"
      >
        {busy ? "Enregistrement…" : "Définir le mot de passe"}
      </button>
    </form>
  );
}
