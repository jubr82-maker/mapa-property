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
/**
 * Pages mesurees (nov. 2026, audit SEO) : un exemple de chaque modele de
 * page. Les pages fixes ont leur chemin ; la fiche d'un bien et l'article
 * du Journal sont choisis a chaque mesure parmi les contenus publies
 * (lib/pilotage/psi.ts, resolvePsiPaths).
 */
export const PSI_MODELS = [
  { key: "home", path: "/fr" },
  { key: "list", path: "/fr/biens" },
  { key: "property", path: null },
  { key: "city", path: "/fr/villes/steinfort" },
  { key: "article", path: null },
  { key: "estimate", path: "/fr/services/estimer" },
] as const;
/** Pages fixes mesurees (l'accueil en premier, tendance de Sante du site). */
export const PSI_PATHS = PSI_MODELS.flatMap((m) => (m.path ? [m.path] : []));
/** Mesures lancees en meme temps (au plus), pour menager l'API PageSpeed. */
export const PSI_CONCURRENCY = 4;
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
export const RETENTION_RULES: readonly RetentionRule[] = [
  { table: "admin_auth_log", column: "created_at", months: 12 },
  { table: "property_views", column: "viewed_at", months: 13 },
  { table: "tracking_events", column: "created_at", months: 13 },
  { table: "chatbot_logs", column: "created_at", months: 6 },
  // Controle quotidien (SQL 39, nov. 2026) : 90 jours de detail par page,
  // resumes des passages et positions quotidiennes gardes 1 an.
  { table: "controle_results", column: "created_at", days: 90 },
  { table: "controle_runs", column: "started_at", months: 12 },
  { table: "controle_google_quota", column: "day", days: 90 },
  { table: "seo_positions_daily", column: "day", months: 12 },
];

/** Duree en mois civils, ou en jours. */
export type RetentionRule = { table: string; column: string } & ({ months: number; days?: never } | { days: number; months?: never });

/**
 * Controle quotidien du site et de Google (nov. 2026, page admin
 * "Controle Google", lib/pilotage/controle-*.ts).
 */
/** Domaine controle (celui que Google indexe), sauf CONTROLE_SITE_BASE. */
export const CONTROLE_PUBLIC_ORIGIN = "https://mapaproperty.lu";
/** Arret propre et point de reprise avant la limite de 300 s de Vercel. */
export const CONTROLE_TIME_BUDGET_MS = 270_000;
/** Budget d'un clic dans l'admin (la page relance jusqu'a la fin). */
export const CONTROLE_CLICK_BUDGET_MS = 45_000;
/** Requetes vers le site en parallele (au plus). */
export const CONTROLE_SITE_CONCURRENCY = 8;
/** Inspections Google en parallele (au plus). */
export const CONTROLE_GOOGLE_CONCURRENCY = 5;
/** Limites Google de l'inspection d'URL : 2 000 par jour, 600 par minute. */
export const GOOGLE_INSPECTION_DAILY_LIMIT = 2000;
export const GOOGLE_INSPECTION_MINUTE_LIMIT = 600;
/** Arret net avant la limite du jour (marge de securite). */
export const GOOGLE_INSPECTION_DAILY_STOP = 1950;
/** Rythme maximal effectivement utilise (sous les 600 par minute). */
export const GOOGLE_INSPECTION_PER_MINUTE = 500;
/** Duree du verrou (renouvele a chaque lot ; libere en fin de passage). */
export const CONTROLE_LOCK_SECONDS = 330;
/** Pages indexables recevant moins de liens internes : a corriger. */
export const CONTROLE_MIN_INBOUND_LINKS = 3;
/** Longueur raisonnable d'un title (caracteres). */
export const CONTROLE_TITLE_LENGTH = { min: 15, max: 65 } as const;
/** Lien d'inspection Search Console d'une adresse. */
export const searchConsoleInspectLink = (url: string) =>
  `https://search.google.com/search-console/inspect?resource_id=sc-domain%3Amapaproperty.lu&id=${encodeURIComponent(url)}`;
