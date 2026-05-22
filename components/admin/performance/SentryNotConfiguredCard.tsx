import { ArrowUpRight, ShieldAlert } from "lucide-react";

type Props = {
  signupUrl?: string;
  instructions?: string;
  missing?: { token: boolean; org: boolean; project: boolean };
};

export function SentryNotConfiguredCard({
  signupUrl = "https://sentry.io/signup/",
  instructions,
  missing,
}: Props) {
  return (
    <div className="rounded-lg border border-dashed border-[#3D4F63]/25 bg-[#F5EFE1] p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#3D4F63]/10 text-[#3D4F63]">
          <ShieldAlert className="size-5" />
        </span>
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
            Monitoring erreurs
          </p>
          <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">
            Sentry non configuré
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-[#3D4F63]/70">
            {instructions ??
              "Activer Sentry pour suivre les erreurs runtime en production. Créer un projet Sentry (Next.js), puis renseigner SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG et SENTRY_PROJECT dans Vercel."}
          </p>
          {missing ? (
            <ul className="mt-4 flex flex-wrap gap-2 text-xs">
              <li
                className={`rounded-md border px-2 py-1 font-mono ${
                  missing.token
                    ? "border-[#dc2626]/40 bg-[#dc2626]/5 text-[#dc2626]"
                    : "border-[#16a34a]/40 bg-[#16a34a]/5 text-[#16a34a]"
                }`}
              >
                SENTRY_AUTH_TOKEN {missing.token ? "manquant" : "ok"}
              </li>
              <li
                className={`rounded-md border px-2 py-1 font-mono ${
                  missing.org
                    ? "border-[#dc2626]/40 bg-[#dc2626]/5 text-[#dc2626]"
                    : "border-[#16a34a]/40 bg-[#16a34a]/5 text-[#16a34a]"
                }`}
              >
                SENTRY_ORG {missing.org ? "manquant" : "ok"}
              </li>
              <li
                className={`rounded-md border px-2 py-1 font-mono ${
                  missing.project
                    ? "border-[#dc2626]/40 bg-[#dc2626]/5 text-[#dc2626]"
                    : "border-[#16a34a]/40 bg-[#16a34a]/5 text-[#16a34a]"
                }`}
              >
                SENTRY_PROJECT {missing.project ? "manquant" : "ok"}
              </li>
            </ul>
          ) : null}
          <a
            href={signupUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#e0af6e] bg-[#e0af6e] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#3D4F63] hover:border-[#3D4F63]"
          >
            Activer Sentry
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
