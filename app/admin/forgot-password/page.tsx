import { ForgotPasswordForm } from "@/components/admin/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-[#3D4F63]/20 bg-white p-10 shadow-xl shadow-[#3D4F63]/10">
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#e0af6e]">
          MAPA Property
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          Mot de passe oublié
        </h1>
        <p className="mt-2 text-sm text-[#3D4F63]/70">
          Indiquez votre email pour recevoir un lien de récupération.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
