import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export const dynamic = "force-dynamic";

async function loadStats() {
  const supabase = await createSupabaseServerClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [leads, mandates, offmarket, arcova, reviews, blog, recentLeads, recentRequests] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString()),
      supabase
        .from("mandate_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("properties_offmarket")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("arcova_waitlist")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true),
      supabase
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true),
      supabase
        .from("leads")
        .select("id,created_at,first_name,last_name,email,type")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("offmarket_requests")
        .select("id,created_at,prenom,nom,email,status,property_id")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  return {
    leadsMonth: leads.count ?? 0,
    mandatesActive: mandates.count ?? 0,
    offmarketActive: offmarket.count ?? 0,
    arcovaTotal: arcova.count ?? 0,
    reviewsPublished: reviews.count ?? 0,
    blogPublished: blog.count ?? 0,
    recentLeads: recentLeads.data ?? [],
    recentRequests: recentRequests.data ?? [],
  };
}

export default async function AdminDashboardPage() {
  const stats = await loadStats();

  const cards = [
    { label: "Leads ce mois", value: stats.leadsMonth, href: "/admin/leads" },
    { label: "Mandats en attente", value: stats.mandatesActive, href: "/admin/mandates" },
    { label: "Off-Market publiés", value: stats.offmarketActive, href: "/admin/offmarket" },
    { label: "ARCOVA waitlist", value: stats.arcovaTotal, href: "/admin/arcova" },
    { label: "Avis publiés", value: stats.reviewsPublished, href: "/admin/reviews" },
    { label: "Articles publiés", value: stats.blogPublished, href: "/admin/blog" },
  ];

  return (
    <div className="space-y-10">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
          Console MAPA
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          Dashboard
        </h1>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-[#3D4F63]/15 bg-white p-5 transition-colors hover:border-[#B8865A]"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              {c.label}
            </p>
            <p className="mt-3 font-display text-4xl font-bold text-[#3D4F63]">
              {c.value}
            </p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#3D4F63]">
              Derniers leads
            </h2>
            <Link
              href="/admin/leads"
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#B8865A] hover:underline"
            >
              Tout voir →
            </Link>
          </header>
          {stats.recentLeads.length === 0 ? (
            <p className="text-sm text-[#3D4F63]/60">Aucun lead récent.</p>
          ) : (
            <ul className="divide-y divide-[#3D4F63]/10">
              {stats.recentLeads.map(
                (l: {
                  id: string;
                  created_at: string;
                  first_name: string | null;
                  last_name: string | null;
                  email: string;
                  type: string | null;
                }) => (
                  <li key={l.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-[#1A1F2A]">
                        {[l.first_name, l.last_name].filter(Boolean).join(" ") || l.email}
                      </p>
                      <p className="text-xs text-[#3D4F63]/60">
                        {l.email} · {l.type ?? "—"}
                      </p>
                    </div>
                    <time className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
                      {new Date(l.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </time>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#3D4F63]">
              Dernières demandes Off-Market
            </h2>
            <Link
              href="/admin/offmarket/requests"
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#B8865A] hover:underline"
            >
              Tout voir →
            </Link>
          </header>
          {stats.recentRequests.length === 0 ? (
            <p className="text-sm text-[#3D4F63]/60">Aucune demande récente.</p>
          ) : (
            <ul className="divide-y divide-[#3D4F63]/10">
              {stats.recentRequests.map(
                (r: {
                  id: string;
                  created_at: string;
                  prenom: string;
                  nom: string;
                  email: string;
                  status: string;
                  property_id: string;
                }) => (
                  <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-[#1A1F2A]">
                        {r.prenom} {r.nom}
                      </p>
                      <p className="text-xs text-[#3D4F63]/60">
                        {r.email} · {r.status}
                      </p>
                    </div>
                    <time className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </time>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
