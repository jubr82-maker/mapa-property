// Articles lies (nov. 2026, audit SEO, partie D1) : 3 articles publies de la
// meme langue (titre dans la langue de la page), priorite a ceux qui citent
// la meme ville (champ commune, rattache a la meme page de ville), puis les
// plus recents. Module pur.
import { cityForPlace } from "@/lib/internal-links";

type Post = { slug: string | null; commune?: string | null; published_at: string | null; is_published?: boolean | null; title_fr?: string | null; title_en?: string | null; title_de?: string | null };

export function relatedPosts<P extends Post>(current: P, all: P[], locale: string, count = 3): P[] {
  const l = locale === "en" || locale === "de" ? locale : "fr";
  const cityOf = (p: P) => cityForPlace(p.commune ?? null)?.slug ?? null;
  const here = cityOf(current);
  const time = (p: P) => (p.published_at ? new Date(p.published_at).getTime() || 0 : 0);
  return all
    .filter((p) => p.slug && p.slug !== current.slug && p.is_published !== false && (p[`title_${l}` as keyof P] as string | null | undefined)?.trim())
    .map((p) => ({ p, same: here !== null && cityOf(p) === here ? 1 : 0 }))
    .sort((a, b) => b.same - a.same || time(b.p) - time(a.p))
    .slice(0, count)
    .map((x) => x.p);
}
