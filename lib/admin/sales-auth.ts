// MAPA Property : Auth + validation partagees pour /admin/ventes-realisees.
//
// Source unique de l'allowlist (les 2 comptes admin reels) et de la
// validation des champs d'une vente, reutilisees par :
//   - POST   /api/admin/ventes-realisees        (creation)
//   - PATCH  /api/admin/ventes-realisees/[id]    (edition + toggle comparable)
//   - DELETE /api/admin/ventes-realisees/[id]    (suppression)
//
// Meme modele de securite partout : session Supabase + allowlist email
// (admin@mapagroup.org + j.brebion@mapagroup.org), en defense-en-profondeur
// avec la RLS Postgres (policies partners_read/write, migration 20260701).
//
// Source des 2 adresses : lib/admin/admin-emails.ts (source unique du
// projet). On importe les 2 constantes nommées explicitement plutot que
// le tableau ADMIN_EMAILS complet : si l'allowlist admin générale
// s'élargit un jour, cette page ne doit pas hériter silencieusement du
// nouvel accès.

import { LU_COMMUNES } from "@/lib/geo/lu-localities";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { ADMIN_EMAIL_JULIEN, ADMIN_EMAIL_JBREBION } from "@/lib/admin/admin-emails";
import { isSaleType, saleFieldRules, type SaleField } from "@/lib/admin/sale-fields";

export const SALES_ALLOWED_EMAILS = new Set([
  ADMIN_EMAIL_JULIEN,
  ADMIN_EMAIL_JBREBION,
]);

// Julien Brebion est le seul agent (oct. 2026) : toute autre valeur est refusee.
const ALLOWED_AGENTS = new Set(["julien"]);

type RequireOk = { ok: true; supabase: SupabaseClient; userEmail: string };
type RequireErr = { ok: false; response: NextResponse };

/**
 * Verifie session + allowlist. Retourne le client Supabase (anon+cookie,
 * soumis a la RLS) si autorise, sinon une NextResponse 401/403 prete a
 * renvoyer. Meme comportement que le POST historique.
 */
export async function requireSalesAdmin(): Promise<RequireOk | RequireErr> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!user.email || !SALES_ALLOWED_EMAILS.has(user.email)) {
    return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  // Oct. 2026 : double authentification obligatoire (session aal2).
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    return { ok: false, response: NextResponse.json({ error: "mfa_required" }, { status: 403 }) };
  }
  return { ok: true, supabase, userEmail: user.email };
}

export interface SaleInput {
  property_type: string;
  surface_habitable: number | null;
  surface_terrain: number | null;
  chambres: number | null;
  classe_energie: string | null;
  annee_construction: number | null;
  etat: string | null;
  adresse: string;
  commune: string;
  prix_vente: number;
  date_acte: string;
  agent: string;
  notes: string | null;
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function numOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

/**
 * Valide le corps d'une vente (creation OU edition complete) : type de la
 * liste fermee des fiches (lib/admin/sale-fields.ts), champs obligatoires,
 * prix > 0, agent valide. Selon le type, un champ sans objet est ignore
 * (enregistre vide) et la surface n'est obligatoire que pour un logement
 * (surface du terrain pour un terrain). Retourne { insert } ou { error }.
 */
export function parseSaleInput(body: Record<string, unknown>): { insert?: SaleInput; error?: string } {
  const property_type = strOrNull(body.property_type);
  const adresse = strOrNull(body.adresse);
  const commune = strOrNull(body.commune);
  const date_acte = strOrNull(body.date_acte);
  const agent = strOrNull(body.agent);
  const prix_vente = numOrNull(body.prix_vente);

  if (!property_type || !isSaleType(property_type) || !adresse || !commune || !date_acte || !agent || !ALLOWED_AGENTS.has(agent) || !prix_vente || prix_vente <= 0) {
    return { error: "missing_or_invalid_fields" };
  }
  // Oct. 2026 : commune officielle du registre CACLR (nom exact), lue telle
  // quelle par le moteur d'estimation (comparaison par commune).
  if (!LU_COMMUNES.some((c) => c.name === commune)) {
    return { error: "commune_not_official" };
  }

  const rules = saleFieldRules(property_type);
  const kept = (f: SaleField, v: unknown) => (rules[f] === "hidden" ? null : v);
  // Surfaces et chambres : nombre positif (0 refuse pour une surface), ou vide.
  const surface = (f: SaleField) => {
    const n = numOrNull(kept(f, body[f]));
    return n !== null && n > 0 ? Math.round(n) : null;
  };
  const surface_habitable = surface("surface_habitable");
  const surface_terrain = surface("surface_terrain");
  if ((rules.surface_habitable === "required" && surface_habitable === null) || (rules.surface_terrain === "required" && surface_terrain === null)) {
    return { error: "missing_or_invalid_fields" };
  }

  return {
    insert: {
      property_type,
      surface_habitable,
      surface_terrain,
      chambres: numOrNull(kept("chambres", body.chambres)),
      classe_energie: strOrNull(kept("classe_energie", body.classe_energie)),
      annee_construction: numOrNull(kept("annee_construction", body.annee_construction)),
      etat: strOrNull(kept("etat", body.etat)),
      adresse,
      commune,
      prix_vente: Math.round(prix_vente),
      date_acte,
      agent,
      notes: strOrNull(body.notes),
    },
  };
}
