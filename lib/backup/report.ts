// Compte rendu quotidien de la sauvegarde (oct. 2026). Module pur : date,
// reussite ou echec, taille, lignes par table, evolution depuis la veille,
// nombre de sauvegardes conservees. Jamais de contenu de table, de nom,
// d'adresse ni de piece jointe : seulement des noms de tables et des nombres.
type T = (key: string, values?: Record<string, string | number>) => string;

export type BackupReportInput = {
  date: string;
  ok: boolean;
  cause?: string | null;
  sizeBytes?: number | null;
  counts?: Record<string, number> | null;
  previousCounts?: Record<string, number> | null;
  kept?: number | null;
};

const mb = (n: number) => (Math.round((n / 1048576) * 100) / 100).toLocaleString("fr-FR");
const int = (n: number) => n.toLocaleString("fr-FR").replace(/[\u00a0\u202f]/g, " ");

export function buildBackupReport(input: BackupReportInput, t: T): { subject: string; text: string } {
  if (!input.ok) {
    return {
      subject: t("subject_failure", { date: input.date }),
      text: [t("failure_intro", { date: input.date }), t("failure_cause", { cause: input.cause || t("cause_unknown") }), "", t("failure_action"), t("kept", { count: input.kept ?? 0 })].join("\n"),
    };
  }
  const counts = input.counts ?? {};
  const prev = input.previousCounts ?? null;
  const lines = Object.keys(counts)
    .sort()
    .map((table) => {
      const n = counts[table];
      if (!prev || prev[table] === undefined) return t("row_line_new", { table, count: int(n) });
      const d = n - prev[table];
      return t(d === 0 ? "row_line_same" : "row_line_delta", { table, count: int(n), delta: d > 0 ? `+${int(d)}` : `-${int(-d)}` });
    });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    subject: t("subject_success", { date: input.date }),
    text: [
      t("success_intro", { date: input.date }),
      t("size", { size: mb(input.sizeBytes ?? 0) }),
      t("total_rows", { count: int(total), tables: Object.keys(counts).length }),
      t("kept", { count: input.kept ?? 0 }),
      "",
      prev ? t("rows_title") : t("rows_title_first"),
      ...lines,
      "",
      t("not_included"),
    ].join("\n"),
  };
}
