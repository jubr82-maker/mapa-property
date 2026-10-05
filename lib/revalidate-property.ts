// Invalidation des pages publiques d'un bien (oct. 2026). A appeler par
// toute action admin qui modifie un bien, ses photos ou sa video.
//
// Cause corrigee : les actions n'invalidaient que /fr/biens/<slug>. Une
// fiche est aussi servie sous /en et /de, et sous son identifiant Apimo
// numerique (ex. /fr/biens/86388715, resolu par fetchPropertyByIdOrSlug) :
// ces pages restaient en cache jusqu'a 24 h (revalidate = 86400). Le motif
// de route "/[locale]/biens/[slug]" avec le type "page" invalide toutes les
// fiches, toutes langues et tous identifiants confondus
// (node_modules/next/dist/docs/.../revalidatePath.md) ; chacune n'est
// regeneree qu'a sa prochaine visite.
import { revalidatePath, revalidateTag } from "next/cache";
import { PROPERTIES_LIST_TAG } from "@/lib/data";

export function revalidatePublicPropertyPages(): void {
  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/[locale]/biens/[slug]", "page");
  revalidatePath("/[locale]/biens", "page");
  revalidatePath("/[locale]/villes/[ville]", "page");
  revalidatePath("/[locale]", "page");
}
