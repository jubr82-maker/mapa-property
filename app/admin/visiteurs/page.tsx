import Link from "next/link";
import {
  Radar,
  Flame,
  EyeOff,
  TrendingUp,
  Activity,
  Clock,
  ShieldCheck,
  Mail,
  Sparkles,
  Calculator,
  Phone,
} from "lucide-react";
import {
  loadVisitorIntelligence,
  BUCKET_LABELS,
  type RankedItem,
  type ViewedConversionItem,
  type RecentAction,
} from "@/lib/admin/visitor-intelligence";
import { KpiCard } from "@/components/admin/analytics/KpiCard";
import { LineChart } from "@/components/admin/analytics/LineChart";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Petits composants d'affichage — locaux à cette page (même convention que
// app/admin/analytics/page.tsx : SectionHeader/StatCard/etc. n'y sont pas
// exportés non plus, chaque page admin garde ses sous-composants).
// ---------------------------------------------------------------------------

function SectionHeader({
  eyebrow,
  title,
  explanation,
  Icon,
}: {
  eyebrow: string;
  title: string;
  explanation: string;
  Icon: typeof Radar;
}) {
  return (
    <header className="flex items-start gap-3">
      <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-[#3D4F63]/10 text-[#3D4F63]">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#e0af6e]">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl font-bold text-[#3D4F63]">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-[#3D4F63]/70">{explanation}</p>
      </div>
    </header>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[#3D4F63]/20 bg-[#F5EFE1] p-6 text-sm text-[#3D4F63]/70">
      {children}
    </p>
  );
}

function RankedPropertyList({ items, unit }: { items: RankedItem[]; unit: string }) {
  if (items.length === 0) {
    return <EmptyState>Pas encore assez de données — reviens quand il y aura du trafic.</EmptyState>;
  }
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ol className="divide-y divide-[#3D4F63]/10">
      {items.map((item, i) => (
        <li key={item.id} className="flex items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="w-6 shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63]/50">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={item.href}
                  className="truncate font-sans text-sm text-[#1A1F2A] hover:text-[#e0af6e]"
                >
                  {item.label}
                </Link>
                <span className="shrink-0 rounded-full bg-[#3D4F63]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
                  {item.badge}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-40 max-w-full overflow-hidden rounded-full bg-[#3D4F63]/10">
                <div
                  className="h-full rounded-full bg-[#e0af6e]"
                  style={{ width: `${Math.max(4, Math.round((item.count / max) * 100))}%` }}
                />
              </div>
            </div>
          </div>
          <span className="shrink-0 font-display text-xl font-bold text-[#3D4F63]">
            {item.count}
            <span className="ml-1 font-mono text-[10px] font-normal uppercase tracking-[0.15em] text-[#3D4F63]/50">
              {unit}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function ConversionList({ items }: { items: ViewedConversionItem[] }) {
  if (items.length === 0) {
    return <EmptyState>Pas encore assez de vues enregistrées pour comparer.</EmptyState>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-[#3D4F63]/10 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
            <th className="pb-2 font-normal">Bien</th>
            <th className="pb-2 text-right font-normal">Vues</th>
            <th className="pb-2 text-right font-normal">Contacts</th>
            <th className="pb-2 text-right font-normal">Taux</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#3D4F63]/10">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2.5 pr-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    href={item.href}
                    className="truncate text-[#1A1F2A] hover:text-[#e0af6e]"
                  >
                    {item.label}
                  </Link>
                  <span className="shrink-0 rounded-full bg-[#3D4F63]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
                    {item.badge}
                  </span>
                </div>
              </td>
              <td className="py-2.5 text-right font-mono text-xs text-[#3D4F63]/70">
                {item.views}
              </td>
              <td className="py-2.5 text-right font-mono text-xs text-[#3D4F63]/70">
                {item.contacts}
              </td>
              <td className="py-2.5 text-right">
                <span
                  className={`font-mono text-xs font-semibold ${
                    item.ratePct > 0 ? "text-[#3F8F62]" : "text-[#3D4F63]/40"
                  }`}
                >
                  {item.ratePct}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const BUCKET_ICONS: Record<RecentAction["bucket"], typeof Mail> = {
  contact: Mail,
  estimation: Sparkles,
  offmarket: ShieldCheck,
  simulateur: Calculator,
  telephone: Phone,
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function RecentFeedList({ items }: { items: RecentAction[] }) {
  if (items.length === 0) {
    return <EmptyState>Aucune action enregistrée pour le moment.</EmptyState>;
  }
  return (
    <ul className="divide-y divide-[#3D4F63]/10">
      {items.map((item, i) => {
        const Icon = BUCKET_ICONS[item.bucket];
        return (
          <li key={i} className="flex items-center gap-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#3D4F63]/10 text-[#3D4F63]">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[#1A1F2A]">
                <span className="font-medium">{item.label}</span>
                {item.propertyLabel ? (
                  item.href ? (
                    <>
                      {" · "}
                      <Link href={item.href} className="text-[#3D4F63]/70 hover:text-[#e0af6e]">
                        {item.propertyLabel}
                      </Link>
                    </>
                  ) : (
                    <span className="text-[#3D4F63]/70"> · {item.propertyLabel}</span>
                  )
                ) : null}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/50">
              {relativeTime(item.createdAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const BUCKET_ORDER: (keyof typeof BUCKET_LABELS)[] = [
  "contact",
  "estimation",
  "offmarket",
  "simulateur",
  "telephone",
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminVisiteursPage() {
  const data = await loadVisitorIntelligence();

  return (
    <div className="space-y-12">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          Console MAPA
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          Intelligence visiteurs
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3D4F63]/70">
          Qui s&apos;intéresse à quoi sur le site — basé sur les demandes, vues et
          contacts déjà enregistrés (indépendant de Google Analytics, qui n&apos;a
          pas encore de trafic significatif).
        </p>
      </header>

      {/* ============================================================ 1 */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="1"
          title="Biens qui génèrent le plus de demandes"
          explanation="Formulaires envoyés et coordonnées consultées (téléphone/email), tous biens confondus — classiques et off-market."
          Icon={Flame}
        />
        <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
          <RankedPropertyList items={data.topDemand} unit="demandes" />
        </article>
      </section>

      {/* ============================================================ 2 */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="2"
          title="Biens à retravailler"
          explanation="Consultés au moins une fois mais jamais contactés — des candidats à revoir (prix, photos, description). Biens classiques et off-market."
          Icon={EyeOff}
        />
        {!data.available.views ? (
          <EmptyState>
            Le suivi des vues n&apos;est pas encore actif sur ce site (table property_views
            absente).
          </EmptyState>
        ) : (
          <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
            <RankedPropertyList
              items={data.viewedNotContacted.map((v) => ({
                id: v.id,
                label: v.label,
                href: v.href,
                badge: v.badge,
                count: v.views,
              }))}
              unit="vues"
            />
          </article>
        )}
      </section>

      {/* ============================================================ 3 */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="3"
          title="Taux de conversion — de la vue au contact"
          explanation="Sur les biens vus au moins une fois, quelle proportion a généré un contact. Biens classiques et off-market."
          Icon={TrendingUp}
        />
        {!data.available.views ? (
          <EmptyState>Données indisponibles — suivi des vues non actif.</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="Biens vus (90 j)" value={data.conversion.globalViewed} Icon={EyeOff} />
              <KpiCard
                label="Dont au moins 1 contact"
                value={data.conversion.globalContacted}
                Icon={Flame}
              />
              <KpiCard
                label="Taux de conversion global"
                value={data.conversion.globalRatePct}
                unit="%"
                Icon={TrendingUp}
                hint={
                  data.conversion.globalRatePct === null
                    ? "Pas encore de vues enregistrées"
                    : undefined
                }
              />
            </div>
            <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
              <h3 className="mb-4 font-display text-lg font-bold text-[#3D4F63]">
                Détail par bien (top 10 des plus vus)
              </h3>
              <ConversionList items={data.conversion.topProperties} />
            </article>
          </>
        )}
      </section>

      {/* ============================================================ 4 */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="4"
          title="Ce qui intéresse le plus les visiteurs"
          explanation="Volume d'actions par type — contact, estimation, off-market, simulateur, téléphone — sur les 30 et 90 derniers jours."
          Icon={Activity}
        />
        {!data.available.events ? (
          <EmptyState>Le suivi des actions n&apos;est pas encore actif sur ce site.</EmptyState>
        ) : (
          <>
            <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
              <h3 className="mb-4 font-display text-lg font-bold text-[#3D4F63]">
                Total d&apos;actions par jour · 30 derniers jours
              </h3>
              <LineChart data={data.volumeByType.dailySeries} label="actions" />
            </article>
            <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
              <h3 className="mb-4 font-display text-lg font-bold text-[#3D4F63]">
                Répartition par type
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[380px] text-sm">
                  <thead>
                    <tr className="border-b border-[#3D4F63]/10 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
                      <th className="pb-2 font-normal">Type d&apos;action</th>
                      <th className="pb-2 text-right font-normal">30 jours</th>
                      <th className="pb-2 text-right font-normal">90 jours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3D4F63]/10">
                    {BUCKET_ORDER.map((b) => (
                      <tr key={b}>
                        <td className="py-2.5 text-[#1A1F2A]">{BUCKET_LABELS[b]}</td>
                        <td className="py-2.5 text-right font-mono text-xs text-[#3D4F63]">
                          {data.volumeByType.counts30d[b]}
                        </td>
                        <td className="py-2.5 text-right font-mono text-xs text-[#3D4F63]/60">
                          {data.volumeByType.counts90d[b]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </>
        )}
      </section>

      {/* ============================================================ 5 */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="5"
          title="Dernières actions"
          explanation="Qui a fait quoi, sur quel bien, et quand — les 30 actions les plus récentes."
          Icon={Clock}
        />
        {!data.available.events ? (
          <EmptyState>Le suivi des actions n&apos;est pas encore actif sur ce site.</EmptyState>
        ) : (
          <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
            <RecentFeedList items={data.recentFeed} />
          </article>
        )}
      </section>

      {/* ============================================================ 6 */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="6"
          title="Demandes off-market (NDA) par bien"
          explanation="Combien de demandes d'accès au dossier complet chaque bien confidentiel a reçues."
          Icon={ShieldCheck}
        />
        {!data.available.leads ? (
          <EmptyState>Données indisponibles.</EmptyState>
        ) : data.ndaByProperty.top.length === 0 ? (
          <EmptyState>Aucune demande off-market enregistrée pour le moment.</EmptyState>
        ) : (
          <>
            <KpiCard
              label="Demandes NDA · 12 mois"
              value={data.ndaByProperty.total}
              Icon={ShieldCheck}
            />
            <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
              <RankedPropertyList items={data.ndaByProperty.top} unit="demandes" />
            </article>
          </>
        )}
      </section>
    </div>
  );
}
