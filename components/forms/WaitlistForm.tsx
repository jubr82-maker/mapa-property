"use client";

// Sprint waitlist : formulaire d'inscription liste d'attente.
// Clone de ContactForm avec les champs propres au flux : prenom, nom,
// email, budget (texte libre), budget_validated (oui/non), search
// (textarea grande), rgpd obligatoire avec texte etendu + lien policy.
// Reutilise Turnstile + honeypot. POST -> /api/liste-attente.

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Turnstile } from "@/components/ui/Turnstile";
import { Link } from "@/i18n/navigation";

type Status = "idle" | "submitting" | "success" | "error";
type ErrorKind = "captcha" | "invalid" | "generic";

const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const turnstileEnabled = Boolean(sitekey);

export function WaitlistForm() {
  const locale = useLocale();
  const t = useTranslations("waitlist_page");
  const tForm = useTranslations("form");
  const [status, setStatus] = useState<Status>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [token, setToken] = useState<string | null>(null);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [budgetValidated, setBudgetValidated] = useState<"oui" | "non">("non");
  const [rgpd, setRgpd] = useState(false);

  const captchaReady = !turnstileEnabled || Boolean(token) || captchaFailed;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      first_name: String(formData.get("first_name") ?? "").trim(),
      last_name: String(formData.get("last_name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      budget: String(formData.get("budget") ?? "").trim(),
      budget_validated: budgetValidated,
      search: String(formData.get("search") ?? "").trim(),
      rgpd_consent: rgpd,
      lang: locale,
      honeypot: String(formData.get("honeypot") ?? ""),
      turnstile_token: token ?? undefined,
    };
    try {
      const res = await fetch("/api/liste-attente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
        setBudgetValidated("non");
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
    status === "submitting" || !rgpd || (turnstileEnabled && !captchaReady);

  if (status === "success") {
    return (
      <div className="rounded-xl border border-gold bg-gold/5 p-6 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
          {tForm("success_eyebrow")}
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
      {/* Honeypot anti-bot (hors flux visuel). */}
      <input
        type="text"
        name="honeypot"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="first_name" label={t("label_first_name")} required />
        <Field name="last_name" label={t("label_last_name")} required />
      </div>
      <Field name="email" type="email" label={t("label_email")} required />
      <Field name="budget" label={t("label_budget")} required />
      <fieldset className="flex flex-col gap-2">
        <legend className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
          {t("label_budget_validated")}
          <span className="ml-1 text-gold-deep">*</span>
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="budget_validated"
              value="oui"
              checked={budgetValidated === "oui"}
              onChange={() => setBudgetValidated("oui")}
              className="size-4 accent-gold-deep"
            />
            {t("label_budget_validated_yes")}
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="budget_validated"
              value="non"
              checked={budgetValidated === "non"}
              onChange={() => setBudgetValidated("non")}
              className="size-4 accent-gold-deep"
            />
            {t("label_budget_validated_no")}
          </label>
        </div>
      </fieldset>
      <Field
        name="search"
        label={t("label_search")}
        as="textarea"
        rows={6}
        required
      />

      <Turnstile
        onToken={setToken}
        onUnavailable={() => setCaptchaFailed(true)}
        className="mt-2"
      />

      {status === "error" && (
        <p className="rounded-md border border-accent-warm/40 bg-accent-warm/10 px-4 py-2 font-mono text-xs text-accent-warm">
          {errorMessage}
        </p>
      )}

      <label className="flex items-start gap-3 text-sm leading-snug text-ink-mid">
        <input
          type="checkbox"
          checked={rgpd}
          onChange={(e) => setRgpd(e.target.checked)}
          className="mt-0.5 size-4 accent-gold-deep"
        />
        <span>
          {t("label_rgpd")}{" "}
          <Link
            href="/legal/rgpd"
            target="_blank"
            className="underline hover:text-gold-deep"
          >
            {t("rgpd_policy_link")}
          </Link>
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-soft">{t("rgpd_notice")}</p>
        <button
          type="submit"
          disabled={submitDisabled}
          className="gold-shine-bg inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-50"
        >
          {status === "submitting"
            ? t("submitting")
            : !captchaReady
              ? tForm("captcha_pending")
              : t("submit")}
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
  as?: "input" | "textarea";
  rows?: number;
}

function Field({ name, label, type = "text", required, as = "input", rows }: FieldProps) {
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
          rows={rows ?? 5}
          className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
        />
      )}
    </label>
  );
}
