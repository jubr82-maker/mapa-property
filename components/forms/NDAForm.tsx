"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Turnstile } from "@/components/ui/Turnstile";

interface Props {
  propertyRef: string;
  propertyTitle: string;
}

type Status = "idle" | "submitting" | "success" | "error";

export function NDAForm({ propertyRef, propertyTitle }: Props) {
  const locale = useLocale();
  const t = useTranslations("nda");
  const tForm = useTranslations("form");
  const [status, setStatus] = useState<Status>("idle");
  const [token, setToken] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ndaAccepted = fd.get("nda_accepted") === "on";
    const proofOfFunds = fd.get("proof_of_funds") === "on";

    if (!ndaAccepted || !proofOfFunds) {
      setStatus("error");
      return;
    }
    setStatus("submitting");

    const payload = {
      prenom: String(fd.get("first_name") ?? ""),
      nom: String(fd.get("last_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      telephone: String(fd.get("phone") ?? ""),
      criteres_precis:
        String(fd.get("message") ?? "") +
        `\n\n[NDA] Accepté · [Capacité] Confirmée · [Bien] ${propertyTitle}`,
      property_id: propertyRef,
      lang: locale,
      turnstile_token: token ?? undefined,
    };
    try {
      const res = await fetch("/api/offmarket-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      e.currentTarget.reset();
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="first_name" label={tForm("first_name")} required />
        <Field name="last_name" label={tForm("last_name")} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" type="email" label={tForm("email")} required />
        <Field name="phone" type="tel" label={tForm("phone")} required />
      </div>
      <Field
        name="message"
        label={t("project_label")}
        as="textarea"
        placeholder={t("project_placeholder")}
        required
      />

      <div className="space-y-3 rounded-xl border border-gold/30 bg-bg-soft p-4">
        <Checkbox name="nda_accepted" label={t("nda_label")} required />
        <Checkbox name="proof_of_funds" label={t("proof_label")} required />
      </div>

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
          disabled={status === "submitting"}
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
  name,
  label,
  type = "text",
  required,
  placeholder,
  as = "input",
}: {
  name: string;
  label: string;
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
          name={name}
          required={required}
          placeholder={placeholder}
          rows={5}
          className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
        />
      )}
    </label>
  );
}

function Checkbox({
  name,
  label,
  required,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-snug text-ink-mid">
      <input
        type="checkbox"
        name={name}
        required={required}
        className="mt-0.5 size-4 accent-gold-deep"
      />
      <span>{label}</span>
    </label>
  );
}
