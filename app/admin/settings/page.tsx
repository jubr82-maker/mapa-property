import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SettingsClient } from "@/components/admin/SettingsClient";
import { ADMIN_LOCALE } from "@/lib/datetime";

export const dynamic = "force-dynamic";

// Sous-traitants RGPD affiches (cles de traduction admin_settings).
const PROCESSORS = [
  "processor_vercel",
  "processor_supabase",
  "processor_cloudflare",
  "processor_ionos",
  "processor_apimo",
  "processor_mistral",
  "processor_gandi",
] as const;

export default async function AdminSettingsPage() {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_settings" });
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          {t("title")}
        </h1>
      </header>

      <SettingsClient userEmail={user?.email ?? null} />

      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <h2 className="font-display text-xl font-bold text-[#3D4F63]">
          {t("agency_title")}
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Info label={t("phone")} value={t("see_legal")} />
          <Info label={t("email")} value={t("see_legal")} />
          <Info label={t("notifications")} value={t("notifications_value")} />
          <Info label={t("headquarters")} value={t("headquarters_value")} />
        </dl>
        <p className="mt-3 text-xs text-[#3D4F63]/60">{t("read_only_note")}</p>
      </section>

      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <h2 className="font-display text-xl font-bold text-[#3D4F63]">
          {t("processors_title")}
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-[#3D4F63]/80">
          {PROCESSORS.map((key) => (
            <li key={key}>
              • {t.rich(key, { b: (chunks) => <strong>{chunks}</strong> })}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[#1A1F2A]">{value}</dd>
    </div>
  );
}
