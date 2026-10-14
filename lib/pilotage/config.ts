// Parametres du pilotage de l'admin (oct. 2026), source unique. Aucun
// import serveur : utilisable partout, y compris par les tests.

/** Leads sans suivi : premier seuil puis seuil critique, en heures. */
export const LEAD_FOLLOWUP_WARN_HOURS = 24;
export const LEAD_FOLLOWUP_CRITICAL_HOURS = 48;

/** Rafale d'echecs de connexion declenchant une alerte e-mail. */
export const LOGIN_BURST_THRESHOLD = 5;
export const LOGIN_BURST_WINDOW_MINUTES = 15;

/** Expiration du nom de domaine (registrar Gandi) et preavis d'alerte. */
export const DOMAIN_NAME = "mapaproperty.lu";
export const DOMAIN_EXPIRY_DATE = "2027-06-13";
export const DOMAIN_ALERT_MONTHS = 3;

/** Sauvegarde R2 consideree en retard au-dela de ce nombre de jours. */
// Sauvegarde nocturne (oct. 2026) : en retard apres 2 jours sans fichier.
export const BACKUP_MAX_AGE_DAYS = 2;
/** Destinataire du compte rendu quotidien de la sauvegarde (aucune donnee personnelle). */
export const BACKUP_REPORT_RECIPIENT = "site@mapagroup.org";

/** Biens en ligne depuis plus de ce nombre de jours : a retravailler. */
export const LISTING_STALE_DAYS = 90;

/** Pages mesurees chaque jour par PageSpeed Insights. */
export const PSI_PATHS = ["/fr", "/fr/biens", "/fr/services/estimer"] as const;
export const PSI_STRATEGIES = ["mobile", "desktop"] as const;
/** Delai minimal entre deux mesures lancees a la main. */
export const PSI_MANUAL_COOLDOWN_MINUTES = 10;
/** Delai minimal entre deux sauvegardes lancees a la main (Sante du site). */
export const BACKUP_MANUAL_COOLDOWN_MINUTES = 5;

/**
 * Seuils Core Web Vitals publies par Google (bon / a ameliorer / mauvais).
 * INP a remplace FID comme indicateur de reactivite. Valeurs reprises de
 * la documentation Google, non reverifiees en ligne dans ce depot.
 */
export const CWV_THRESHOLDS = {
  lcpMs: { good: 2500, poor: 4000 },
  inpMs: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
} as const;

/** Propriete Search Console (propriete de domaine). */
export const SEARCH_CONSOLE_SITE = "sc-domain:mapaproperty.lu";

/** Jour du resume hebdomadaire, heure de Luxembourg : 1 = lundi. */
export const WEEKLY_SUMMARY_WEEKDAY = 1;

/**
 * Durees de conservation acceptees par Julien le 2026-10-05, purgees par
 * la tache quotidienne (lib/pilotage/retention.ts). Memes valeurs que
 * supabase/manual/execution/04_bloc_F.sql. Aucune autre table n'est purgee.
 */
export const RETENTION_RULES = [
  { table: "admin_auth_log", column: "created_at", months: 12 },
  { table: "property_views", column: "viewed_at", months: 13 },
  { table: "tracking_events", column: "created_at", months: 13 },
  { table: "chatbot_logs", column: "created_at", months: 6 },
] as const;
