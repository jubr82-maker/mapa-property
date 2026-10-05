// Authentification des taches planifiees (audit de securite, oct. 2026).
// Avant : comparaison a `Bearer ${process.env.CRON_SECRET}`, qui acceptait
// l'en-tete "Bearer undefined" quand la variable n'etait pas definie.
// OWASP ASVS 4.1.1 (controle d'acces impose cote serveur) et 2.10.4
// (secrets de service jamais par defaut).
import { timingSafeEqual } from "node:crypto";

export function isAuthorizedCron(req: Request): boolean {
  // Valeur brute, comme l'envoie Vercel Cron (pas de trim).
  const secret = process.env.CRON_SECRET;
  // Aucune longueur minimale imposee ici (un secret court deja en place ne
  // doit pas couper les taches) ; recommandation : 32 caracteres aleatoires.
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
