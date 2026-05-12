"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Turnstile } from "@/components/ui/Turnstile";

interface Props {
  type: string;
  source?: string;
  propertyRef?: string;
  defaultMessage?: string;
  showSubject?: boolean;
}

type Status = "idle" | "submitting" | "success" | "error";
type ErrorKind = "captcha" | "invalid" | "generic";

const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const turnstileEnabled = Boolean(sitekey);

export function ContactForm({
  type,
  source = "website",
  propertyRef,
  defaultMessage = "",
  showSubject = false,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("form");
  const [status, setStatus] = useState<Status>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [token, setToken] = useState<string | null>(null);

  // Si Turnstile n'est pas configuré côté client, on autorise la soumission
  // sans token (le back-end fait le bon choix : skip dev / fail prod).
  // Si configuré, on attend que le widget ait fourni un token avant d'accepter
  // le submit — sinon le serveur renvoie 403 et l'utilisateur croit avoir échoué.
  const captchaReady = !turnstileEnabled || Boolean(token);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      first_name: String(formData.get("first_name") ?? ""),
      last_name: String(formData.get("last_name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      message: String(formData.get("message") ?? ""),
      type,
      source,
      property_ref: propertyRef,
      lang: locale,
      turnstile_token: token ?? undefined,
    };
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
        return;
      }
      if (res.status === 403) setErrorKind("captcha");
      else if (res.status === 400) setErrorKind("invalid");
      else setErrorKind("generic");
      setStatus("error");
    } catch {
      setErrorKind("generic");
      setStatus("error");
    }
  };

  const errorMessage =
    errorKind === "captcha"
      ? t("error_captcha")
      : errorKind === "invalid"
        ? t("error_invalid")
        : t("error");
  const submitDisabled =
    status === "submitting" || (turnstileEnabled && !captchaReady);
  const submitLabel =
    status === "submitting"
      ? t("submitting")
      : !captchaReady
        ? t("captcha_pending")
        : t("submit");

  if (status === "success") {
    return (
      <div className="rounded-xl border border-gold bg-gold/5 p-6 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
          {t("success_eyebrow")}
        </p>
        <p className="mt-2 font-display text-xl font-bold">{t("success_title")}</p>
        <p className="mt-2 text-sm text-ink-mid">{t("success_text")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="first_name" label={t("first_name")} required />
        <Field name="last_name" label={t("last_name")} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" type="email" label={t("email")} required />
        <Field name="phone" type="tel" label={t("phone")} />
      </div>
      {showSubject && <Field name="subject" label={t("subject")} />}
      <Field
        name="message"
        label={t("message")}
        as="textarea"
        defaultValue={defaultMessage}
        required
      />

      <Turnstile onToken={setToken} className="mt-2" />

      {status === "error" && (
        <p className="rounded-md border border-accent-warm/40 bg-accent-warm/10 px-4 py-2 font-mono text-xs text-accent-warm">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-soft">{t("rgpd_notice")}</p>
        <button
          type="submit"
          disabled={submitDisabled}
          className="gold-shine-bg inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-50"
        >
          {submitLabel}
          <span aria-hidden>→</span>
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  as?: "input" | "textarea";
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  as = "input",
}: FieldProps) {
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
          defaultValue={defaultValue}
          rows={5}
          className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
        />
      )}
    </label>
  );
}
