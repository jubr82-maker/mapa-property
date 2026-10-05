// Tableau de bord (oct. 2026) : uniquement ce qui demande une action
// aujourd'hui. Chaque point renvoie vers l'espace concerne.
import { loadLeadsControl } from "@/lib/pilotage/leads-control";
import { loadFormHealth, loadEmailLog, loadCronRuns } from "@/lib/pilotage/health";
import { loadJournal, securitySignals } from "@/lib/pilotage/journal";
import { loadBackupStatus, domainStatus } from "@/lib/pilotage/site-facts";
import { loadListingQuality } from "@/lib/pilotage/listing-quality";
import { LOGIN_BURST_THRESHOLD } from "@/lib/pilotage/config";

export type ActionItem = {
  key:
    | "leads_late48"
    | "leads_late24"
    | "leads_waiting"
    | "form_db_errors"
    | "email_failures"
    | "failed_logins"
    | "new_devices"
    | "property_deleted"
    | "backup_late"
    | "backup_none"
    | "backup_error"
    | "listings_incomplete"
    | "domain_expiry"
    | "daily_task_late";
  severity: "critical" | "warning" | "info";
  count: number;
  href: string;
};

const DAILY_TASK_MAX_AGE_HOURS = 36;

export async function loadDashboard(): Promise<{ items: ActionItem[]; checked: string[] }> {
  const [leads, forms, emails, journal, backup, listings, cron] = await Promise.all([
    loadLeadsControl(30),
    loadFormHealth(2),
    loadEmailLog(200),
    loadJournal(2, 500),
    loadBackupStatus(),
    loadListingQuality(),
    loadCronRuns(20),
  ]);
  const items: ActionItem[] = [];
  const push = (i: ActionItem) => i.count > 0 && items.push(i);

  push({ key: "leads_late48", severity: "critical", count: leads.late48, href: "/admin/activite#suivi" });
  push({ key: "leads_late24", severity: "warning", count: leads.late24, href: "/admin/activite#suivi" });
  push({ key: "leads_waiting", severity: "info", count: leads.requests.filter((r) => r.state === "waiting").length, href: "/admin/activite#suivi" });
  push({ key: "form_db_errors", severity: "critical", count: forms.today.db_error + forms.today.error, href: "/admin/sante#formulaires" });
  push({ key: "email_failures", severity: "critical", count: emails.failuresToday, href: "/admin/sante#emails" });

  const sec = securitySignals(journal.entries, 24);
  if (sec.failedLogins >= LOGIN_BURST_THRESHOLD) push({ key: "failed_logins", severity: "critical", count: sec.failedLogins, href: "/admin/journal" });
  push({ key: "new_devices", severity: "warning", count: sec.newDevices, href: "/admin/journal" });
  push({ key: "property_deleted", severity: "warning", count: sec.deletions, href: "/admin/journal" });

  if (backup.status === "late") push({ key: "backup_late", severity: "warning", count: 1, href: "/admin/sante#sauvegardes" });
  if (backup.status === "none") push({ key: "backup_none", severity: "critical", count: 1, href: "/admin/sante#sauvegardes" });
  if (backup.status === "error") push({ key: "backup_error", severity: "warning", count: 1, href: "/admin/sante#sauvegardes" });

  const incomplete = listings.items.filter((i) => i.issues.some((x) => x === "no_cover" || x === "no_price" || x === "no_surface")).length;
  push({ key: "listings_incomplete", severity: "info", count: incomplete, href: "/admin/activite#annonces" });

  const domain = domainStatus();
  if (domain.alert) push({ key: "domain_expiry", severity: domain.daysLeft <= 30 ? "critical" : "warning", count: Math.max(domain.daysLeft, 0), href: "/admin/sante#echeances" });

  if (cron.available) {
    const lastDaily = cron.rows.find((r) => r.task === "daily");
    const late = !lastDaily || Date.now() - new Date(lastDaily.created_at).getTime() > DAILY_TASK_MAX_AGE_HOURS * 3_600_000;
    if (late) push({ key: "daily_task_late", severity: "warning", count: 1, href: "/admin/sante#tache" });
  }

  const rank = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => rank[a.severity] - rank[b.severity]);
  const checked = [
    leads.available ? "leads" : null,
    forms.available ? "forms" : null,
    emails.available ? "emails" : null,
    journal.available.auth ? "security" : null,
    backup.status !== "not_configured" ? "backup" : null,
    listings.available ? "listings" : null,
  ].filter((x): x is string => x !== null);
  return { items, checked };
}
