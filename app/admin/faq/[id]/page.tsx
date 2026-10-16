import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { faqPageOptions } from "@/lib/faq/admin-options";
import { FaqForm } from "@/components/admin/faq/FaqForm";
import type { FaqRow } from "@/lib/faq/data";

export const dynamic = "force-dynamic";

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_faq" });
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("faqs").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as FaqRow & { published: boolean };
  const options = await faqPageOptions(supabase);
  return (
    <div className="space-y-6">
      <Link href="/admin/faq" className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63]/80 hover:text-[#3D4F63]">
        {t("back")}
      </Link>
      <h1 className="font-display text-3xl font-bold text-[#3D4F63]">{t("edit_title")}</h1>
      <FaqForm
        options={options}
        initial={{
          id: r.id,
          page_key: r.page_key,
          question: { fr: r.question_fr ?? "", en: r.question_en ?? "", de: r.question_de ?? "" },
          answer: { fr: r.answer_fr ?? "", en: r.answer_en ?? "", de: r.answer_de ?? "" },
          published: r.published,
        }}
      />
    </div>
  );
}
