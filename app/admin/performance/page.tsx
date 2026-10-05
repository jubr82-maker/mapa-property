// Oct. 2026 : page remplacee par l'espace "Sante du site" du groupe Pilotage
// (contenu utile repris, sans doublon). Adresse conservee pour les favoris.
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export default async function LegacyPilotagePage() {
  await requireAdminPage();
  redirect("/admin/sante#performance");
}
