"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Turnstile } from "@/components/ui/Turnstile";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Link } from "@/i18n/navigation";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { track } from "@/lib/tracking/track";

interface Props {
  propertyRef: string;
  propertyTitle: string;
}

type Status = "idle" | "submitting" | "success" | "error";

const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const turnstileEnabled = Boolean(sitekey);

// Refonte BUG 5 : formulaire entièrement controlé (plus de FormData /
// e.currentTarget — l'ancien bug venait de e.currentTarget.reset()
// appelé APRÈS await, currentTarget étant nul → throw → faux "error"
// alors que la soumission réussissait). Validation : 6 champs requis
// + 3 cases. Endpoint dédié /api/nda-request (écrit dans `leads`).

export function NDAForm({ propertyRef, propertyTitle }: Props) {
  const locale = useLocale();
  const t = useTranslations("nda");
  const tForm = useTranslations("form");
  const tRgpd = useTranslations("rgpd");

  const [status, setStatus] = useState<Status>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [f, setF] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    country: DEFAULT_COUNTRY,
    message: "",
    honeypot: "",
  });
  const [nda, setNda] = useState(false);
  const [proof, setProof] = useState(false);
  const [rgpd, setRgpd] = useState(false);

  const set = (k: keyof typeof f, v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
  const captchaReady = !turnstileEnabled || Boolean(token);
  const formValid =
    f.first_name.trim() !== "" &&
    f.last_name.trim() !== "" &&
    emailOk &&
    f.phone.trim() !== "" &&
    f.message.trim() !== "" &&
    nda &&
    proof &&
    rgpd;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return;
    if (!formValid || !captchaReady) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/nda-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: f.first_name,
          last_name: f.last_name,
          email: f.email,
          phone: f.phone,
          country: f.country,
          message: f.message,
          honeypot: f.honeypot,
          property_ref: propertyRef,
          property_title: propertyTitle,
          nda_accepted: nda,
          proof_of_funds: proof,
          rgpd_consent: rgpd,
          lang: locale,
          turnstile_token: token ?? undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      track("form_submit", {
        form: "nda_request",
        property_id: propertyRef,
      });
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-xl border border-gold bg-gold/5 p-6 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
          {t("success_eyebrow")}
        </p>
        <p className="mt-2 font-display text-xl font-bold">
          {t("success_title")}
        </p>
        <p className="mt-2 text-sm text-ink-mid">{t("success_text")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <p className="text-sm font-medium text-ink">{t("intro")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={tForm("first_name")}
          value={f.first_name}
          onChange={(v) => set("first_name", v)}
          required
        />
        <Field
          label={tForm("last_name")}
          value={f.last_name}
          onChange={(v) => set("last_name", v)}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={tForm("email")}
          type="email"
          value={f.email}
          onChange={(v) => set("email", v)}
          required
        />
        <PhoneInput
          label={tForm("phone")}
          required
          onChange={(v) => set("phone", v)}
        />
      </div>
      <CountrySelect
        label={tForm("country")}
        value={f.country}
        onChange={(v) => set("country", v)}
      />
      <Field
        label={t("project_label")}
        as="textarea"
        placeholder={t("project_placeholder")}
        value={f.message}
        onChange={(v) => set("message", v)}
        required
      />

      <div className="space-y-3 rounded-xl border border-gold/30 bg-bg-soft p-4">
        <Checkbox checked={nda} onChange={setNda} label={t("nda_label")} />
        <Checkbox
          checked={proof}
          onChange={setProof}
          label={t("proof_label")}
        />
        <Checkbox
          checked={rgpd}
          onChange={setRgpd}
          label={
            <>
              {tRgpd("consent_label")}{" "}
              <Link
                href="/legal/rgpd"
                target="_blank"
                className="underline hover:text-gold-deep"
              >
                {tRgpd("policy_link")}
              </Link>
            </>
          }
        />
      </div>

      {/* Honeypot — masqué aux humains, piège à bots */}
      <input
        type="text"
        name="honeypot"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={f.honeypot}
        onChange={(e) => set("honeypot", e.target.value)}
        className="absolute -left-[9999px] size-0 opacity-0"
      />

      <Turnstile onToken={setToken} className="mt-2" />

      {status === "error" && (
        <p className="rounded-md border border-accent-warm/40 bg-accent-warm/10 px-4 py-2 font-mono text-xs text-accent-warm">
          {t("error")}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-soft">{tForm("rgpd_notice")}</p>
        <button
          type="submit"
          disabled={status === "submitting" || !formValid || !captchaReady}
          className="gold-shine-bg inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-50"
        >
          {status === "submitting" ? tForm("submitting") : t("submit")}
          <span aria-hidden>→</span>
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  as = "input",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  as?: "input" | "textarea";
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
        {required && <span className="ml-1 text-gold-deep">*</span>}
      </span>
      {as === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
        />
      )}
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-snug text-ink-mid">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-gold-deep"
      />
      <span>{label}</span>
    </label>
  );
}
