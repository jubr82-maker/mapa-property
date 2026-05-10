import { Link } from "@/i18n/navigation";
import { supabaseServer } from "@/lib/supabase-server";

interface CoupDeCoeurRow {
  id: string;
  property_id: string;
  title: string;
  city: string;
  price_eur: number;
  surface_m2: number | null;
  rooms: number | null;
  photo_url: string;
  detail_url: string | null;
  display_order: number;
}

async function fetchCoupsDeCoeur(): Promise<CoupDeCoeurRow[]> {
  try {
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("coups_de_coeur")
      .select("id, property_id, title, city, price_eur, surface_m2, rooms, photo_url, detail_url, display_order")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .limit(8);
    if (error) {
      console.error("[CoupsDeCoeur] fetch", error.message);
      return [];
    }
    return (data ?? []) as CoupDeCoeurRow[];
  } catch (e) {
    console.error("[CoupsDeCoeur] caught", e);
    return [];
  }
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export async function CoupsDeCoeur() {
  const items = await fetchCoupsDeCoeur();

  return (
    <section className="px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-10 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            Coups de cœur
          </p>
          <h2 className="mt-2 font-display text-4xl font-black leading-tight tracking-tight text-ink sm:text-5xl">
            Sélection MAPA
          </h2>
          <p className="mt-3 text-base text-ink-mid">
            Quatre biens choisis pour leur caractère, mis à jour en continu par l&apos;agence.
          </p>
        </header>

        {items.length === 0 ? (
          <div className="rounded-lg border border-line bg-bg-soft p-10 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
              Sélection en préparation
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-mid">
              Contactez-nous pour un accès anticipé à nos prochaines ouvertures.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-navy-deep"
            >
              Prendre contact
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <div className="snap-x snap-mandatory overflow-x-auto">
            <ul className="flex gap-6 pb-4">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="snap-start shrink-0 basis-[85%] sm:basis-[48%] lg:basis-[32%]"
                >
                  <Link
                    href={(p.detail_url ?? `/biens/${p.property_id}`) as string}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-bg transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-bg-deep">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.photo_url}
                        alt={p.title}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                        {p.city}
                        {p.surface_m2 ? ` · ${p.surface_m2} m²` : null}
                        {p.rooms ? ` · ${p.rooms} ch.` : null}
                      </p>
                      <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-ink group-hover:text-gold-deep">
                        {p.title}
                      </h3>
                      <p className="mt-auto font-display text-lg font-bold gold-text">
                        {formatEuro(p.price_eur)} €
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
