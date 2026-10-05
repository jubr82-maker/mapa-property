"use client";

import { useRouter } from "next/navigation";
import type { FactorSummary } from "@/app/admin/auth-actions";
import { MfaEnroll, MfaVerify } from "@/components/admin/MfaPanel";

/** Apres verification ou inscription : session aal2, retour vers l'admin. */
export function MfaGate({
  mode,
  factors,
  redirectTo,
  defaultName,
}: {
  mode: "verify" | "enroll";
  factors: FactorSummary[];
  redirectTo: string;
  defaultName: string;
}) {
  const router = useRouter();
  const done = () => {
    router.replace(redirectTo);
    router.refresh();
  };
  return mode === "verify" ? (
    <MfaVerify factors={factors} onSuccess={done} />
  ) : (
    <MfaEnroll defaultName={defaultName} onSuccess={done} />
  );
}
