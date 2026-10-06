import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE, formatDateTime } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { PropertiesTable } from "@/components/admin/PropertiesTable";
import { AdminNotice } from "@/components/admin/AdminNotice";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ featured?: string; q?: string; transaction?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  // Onglets Actifs / Archives (oct. 2026). La colonne archived_at n'existe
  // qu'apres le SQL supabase/manual/20261005_archivage_biens.sql : sans
  // elle, la requete filtree echoue et on retombe sur la liste complete,
  // actions d'archivage desactivees (message explicite).
  const archivedTab = sp.tab === "archived";
  const tArchive = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_properties" });
  const SELECT_BASE =
    "id,slug,transaction,country,city,title_fr,price,surface,bedrooms,energy,is_published,is_featured,featured_order,property_images(url,sort)";
  const buildQuery = (withArchive: boolean) => {
    let q = supabase
      .from("properties")
      .select(withArchive ? `${SELECT_BASE},archived_at` : SELECT_BASE)
      .order(withArchive && archivedTab ? "archived_at" : "created_at", { ascending: false })
      .limit(500);
    if (withArchive) q = archivedTab ? q.not("archived_at", "is", null) : q.is("archived_at", null);
    if (sp.featured === "1") q = q.eq("is_featured", true);
    if (sp.transaction) q = q.eq("transaction", sp.transaction);
    return q;
  };
  let archiveReady = true;
  let { data, error } = await buildQuery(true);
  if (error && /archived_at/.test(error.message)) {
    archiveReady = false;
    ({ data, error } = await buildQuery(false));
    if (archivedTab) data = [];
  }
  if (error) {
    console.error("[admin/properties] query error:", error);
  }
  type ListRow = {
    id: string; slug: string | null; transaction: string | null; country: string | null; city: string | null;
    title_fr: string | null; price: number | null; surface: number | null; bedrooms: number | null;
    energy: string | null; is_published: boolean | null; is_featured: boolean | null;
    property_images: unknown; archived_at?: string | null;
  };
  const list = (data ?? []) as unknown as ListRow[];
  const filtered = list.filter((p) => {
    if (!sp.q) return true;
    const needle = sp.q.toLowerCase();
    const hay = `${p.slug ?? ""} ${p.title_fr ?? ""} ${p.city ?? ""}`.toLowerCase();
    return hay.includes(needle);
  });
  const rows = filtered.map((p) => {
    type Img = { url: string; sort: number | null };
    const imgs = (p.property_images as Img[] | null) ?? [];
    const sorted = [...imgs].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    // Photo principale : property_images.sort = 0.
    const cover = sorted[0]?.url ?? null;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title_fr,
      city: p.city,
      country: p.country && tArchive.has(`country_${p.country}`) ? tArchive(`country_${p.country}`) : p.country,
      transaction: p.transaction,
      transaction_label:
        p.transaction && tArchive.has(`transaction_${p.transaction}`)
          ? tArchive(`transaction_${p.transaction}`)
          : (p.transaction ?? ""),
      price: p.price,
      surface: p.surface,
      bedrooms: p.bedrooms,
      energy: p.energy,
      cover,
      is_published: !!p.is_published,
      is_featured: !!p.is_featured,
      archived_label: p.archived_at
        ? tArchive("archived_on", { date: formatDateTime(p.archived_at) })
        : null,
    };
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {tArchive("console_kicker")}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {tArchive("list_title")}
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {tArchive("list_count", { count: rows.length })}
            {". "}
            {tArchive("list_hint")}
          </p>
          {error && (
            <div className="mt-2"><AdminNotice kind="read_error" /></div>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/properties"
            className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] ${
              !sp.featured
                ? "bg-[#3D4F63] text-[#F5EFE1]"
                : "border border-[#3D4F63]/20 text-[#3D4F63]"
            }`}
          >
            {tArchive("filter_all")}
          </Link>
          <Link
            href="/admin/properties?featured=1"
            className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] ${
              sp.featured === "1"
                ? "bg-[#e0af6e] text-white"
                : "border border-[#3D4F63]/20 text-[#3D4F63]"
            }`}
          >
            {tArchive("filter_featured")}
          </Link>
          <Link
            href="/admin/properties/new"
            className="rounded-full bg-[#e0af6e] px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#3D4F63]"
          >
            {tArchive("new_property")}
          </Link>
        </div>
      </header>
      {!archiveReady && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {tArchive("migration_missing")}
        </p>
      )}
      <nav className="flex flex-wrap gap-2" data-admin-chips>
        <Link
          href="/admin/properties"
          className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] ${
            !archivedTab ? "bg-[#3D4F63] text-[#F5EFE1]" : "border border-[#3D4F63]/20 text-[#3D4F63]"
          }`}
        >
          {tArchive("tab_active")}
        </Link>
        <Link
          href="/admin/properties?tab=archived"
          className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] ${
            archivedTab ? "bg-[#3D4F63] text-[#F5EFE1]" : "border border-[#3D4F63]/20 text-[#3D4F63]"
          }`}
        >
          {tArchive("tab_archived")}
        </Link>
      </nav>
      {archivedTab && rows.length === 0 ? (
        <p className="text-sm text-[#3D4F63]/70">{tArchive("empty_archived")}</p>
      ) : (
        <PropertiesTable
          rows={rows}
          mode={archivedTab ? "archived" : "active"}
          archiveEnabled={archiveReady}
          labels={{
            archive: tArchive("archive"),
            restore: tArchive("restore"),
            delete: tArchive("delete"),
            purgeMedia: tArchive("purge_media"),
            archivedCol: tArchive("archived_col"),
            archiveConfirm: tArchive("archive_confirm"),
            deleteTitle: tArchive("delete_title"),
            deleteBodyTemplate: tArchive.raw("delete_body") as string,
            deleteInputLabel: tArchive("delete_input_label"),
            deleteMismatch: tArchive("delete_mismatch"),
            cancel: tArchive("cancel"),
            deletedMediaTitle: tArchive("deleted_media_title"),
            deletedNoMedia: tArchive("deleted_no_media"),
            purgeConfirm: tArchive("purge_confirm"),
            purgeDoneTemplate: tArchive.raw("purge_done") as string,
            errorTemplate: tArchive.raw("error") as string,
            emptyList:
              sp.q || sp.transaction || sp.featured === "1"
                ? tArchive("empty_filtered")
                : tArchive("empty_list"),
          }}
        />
      )}
    </div>
  );
}
