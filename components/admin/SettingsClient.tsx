"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-ssr";

type MfaStatus = "loading" | "none" | "enrolled" | "enrolling";

export function SettingsClient({ userEmail }: { userEmail: string | null }) {
  return (
    <div className="space-y-6">
      <PasswordSection />
      <MfaSection />
      <PasskeySection />
      <AccountInfoSection email={userEmail} />
    </div>
  );
}

// ----- Password change -----------------------------------------------------
function PasswordSection() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({ tone: "err", text: "Au moins 8 caractères." });
      return;
    }
    if (password !== confirm) {
      setMsg({ tone: "err", text: "Les mots de passe ne correspondent pas." });
      return;
    }
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMsg({ tone: "err", text: error.message });
      return;
    }
    setMsg({ tone: "ok", text: "Mot de passe mis à jour." });
    setPassword("");
    setConfirm("");
  };

  return (
    <Section title="Mot de passe">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Nouveau">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={inputCls}
          />
        </Field>
        <Field label="Confirmer">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={inputCls}
          />
        </Field>
        <button
          type="submit"
          disabled={busy}
          className={btnCls}
        >
          {busy ? "…" : "Mettre à jour"}
        </button>
      </form>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
    </Section>
  );
}

// ----- 2FA TOTP -----------------------------------------------------------
function MfaSection() {
  const [status, setStatus] = useState<MfaStatus>("loading");
  const [qr, setQr] = useState<{ uri: string; secret: string; factorId: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null);

  const refresh = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === "verified");
    if (verified) {
      setEnrolledFactorId(verified.id);
      setStatus("enrolled");
    } else {
      setEnrolledFactorId(null);
      setStatus("none");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const enroll = async () => {
    setMsg(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    // Si un facteur unverified existait déjà, on nettoie pour repartir frais
    const list = await supabase.auth.mfa.listFactors();
    const stale = list.data?.totp?.find((f) => f.status !== "verified");
    if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "MAPA Admin TOTP",
    });
    if (error || !data) {
      setBusy(false);
      setMsg({ tone: "err", text: error?.message ?? "Erreur enrollment." });
      return;
    }
    setQr({
      uri: data.totp.uri,
      secret: data.totp.secret,
      factorId: data.id,
    });
    setStatus("enrolling");
    setBusy(false);
  };

  const verify = async () => {
    if (!qr) return;
    setMsg(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId: qr.factorId });
    if (challenge.error) {
      setBusy(false);
      setMsg({ tone: "err", text: challenge.error.message });
      return;
    }
    const ver = await supabase.auth.mfa.verify({
      factorId: qr.factorId,
      challengeId: challenge.data.id,
      code,
    });
    setBusy(false);
    if (ver.error) {
      setMsg({ tone: "err", text: ver.error.message });
      return;
    }
    setMsg({ tone: "ok", text: "2FA activée. Elle sera demandée à chaque connexion." });
    setQr(null);
    setCode("");
    await refresh();
  };

  const disable = async () => {
    if (!enrolledFactorId) return;
    if (!confirm("Désactiver le 2FA ? Vous perdrez la couche de sécurité supplémentaire.")) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: enrolledFactorId });
    setBusy(false);
    if (error) {
      setMsg({ tone: "err", text: error.message });
      return;
    }
    setMsg({ tone: "ok", text: "2FA désactivée." });
    await refresh();
  };

  return (
    <Section title="Double authentification (TOTP)">
      {status === "loading" && <p className="text-sm text-[#3D4F63]/60">Chargement…</p>}

      {status === "none" && (
        <div className="space-y-3">
          <p className="text-sm text-[#3D4F63]/80">
            Ajoute une couche de sécurité : à chaque connexion, un code 6 chiffres
            généré par une application d&apos;authentification (1Password, Authy,
            Google Authenticator) sera demandé après le mot de passe.
          </p>
          <button onClick={enroll} disabled={busy} className={btnCls}>
            {busy ? "…" : "Activer la 2FA"}
          </button>
        </div>
      )}

      {status === "enrolling" && qr && (
        <div className="space-y-4">
          <p className="text-sm text-[#3D4F63]/80">
            Scanne ce QR code dans ton app d&apos;authentification, puis saisis le
            code 6 chiffres affiché pour valider l&apos;enrôlement.
          </p>
          <div className="flex flex-col items-start gap-3 rounded-xl border border-[#3D4F63]/15 bg-[#F5EFE1] p-4 sm:flex-row sm:items-center">
            <div className="rounded-md bg-white p-2">
              {/* QR code via service Google Chart (compatible standard otpauth) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qr.uri)}`}
                alt="QR code 2FA"
                width={180}
                height={180}
              />
            </div>
            <div className="text-xs text-[#3D4F63]/80">
              <p className="font-mono uppercase tracking-[0.2em]">Secret :</p>
              <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-[11px]">
                {qr.secret}
              </code>
              <p className="mt-2">À saisir manuellement si le scan échoue.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Code 6 chiffres">
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={`${inputCls} text-center text-lg tracking-[0.4em]`}
              />
            </Field>
            <button
              onClick={verify}
              disabled={busy || code.length !== 6}
              className={btnCls}
            >
              {busy ? "…" : "Valider"}
            </button>
          </div>
        </div>
      )}

      {status === "enrolled" && (
        <div className="space-y-3">
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            ✓ 2FA active sur ce compte.
          </p>
          <button onClick={disable} disabled={busy} className={btnSecondaryCls}>
            Désactiver le 2FA
          </button>
        </div>
      )}

      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}
    </Section>
  );
}

// ----- Passkeys ------------------------------------------------------------
function PasskeySection() {
  return (
    <Section title="Touch ID / Passkey (WebAuthn)">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold">Module en cours d&apos;intégration.</p>
        <p className="mt-2 text-amber-700">
          L&apos;authentification Passkey / Touch ID requiert un service WebAuthn
          côté serveur (génération de challenge, vérification de signature),
          stockage des clés publiques en base, et l&apos;extension du flux Supabase
          Auth. À livrer en pair-programming avec Julien — voir BLOCKERS.md.
          En attendant, l&apos;équipe MAPA peut s&apos;appuyer sur la 2FA TOTP
          ci-dessus pour la sécurité renforcée.
        </p>
      </div>
    </Section>
  );
}

// ----- Account info --------------------------------------------------------
function AccountInfoSection({ email }: { email: string | null }) {
  return (
    <Section title="Compte">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            Email
          </dt>
          <dd className="mt-0.5 font-mono text-sm text-[#1A1F2A]">{email ?? "—"}</dd>
        </div>
      </dl>
    </Section>
  );
}

// ----- Primitives ----------------------------------------------------------
const inputCls =
  "block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm text-[#1A1F2A] focus:border-[#B8865A] focus:outline-none";
const btnCls =
  "rounded-full bg-[#3D4F63] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#B8865A] disabled:opacity-50";
const btnSecondaryCls =
  "rounded-full border border-red-200 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-[#3D4F63]">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Msg({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-300 bg-red-50 text-red-700";
  return (
    <p className={`mt-3 rounded-md border px-3 py-2 text-sm ${cls}`}>{children}</p>
  );
}
