// Classes communes des formulaires d'authentification admin (style admin
// existant). Aucun texte : les libelles viennent de next-intl.
export const authLabelCls =
  "block font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70";
// Telephone (oct. 2026) : champs et boutons plus hauts (44 px et plus,
// texte a 16 px impose par app/admin/admin-mobile.css).
export const authInputCls =
  "mt-1 block w-full rounded-md border border-[#3D4F63]/30 bg-white px-3 py-2 font-sans text-sm text-[#1A1F2A] focus:border-[#3D4F63] focus:outline-none max-md:py-3";
export const authButtonCls =
  "w-full rounded-md bg-[#3D4F63] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#1A1F2A] disabled:opacity-50 max-md:py-3.5";
export const authErrorCls =
  "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700";
export const authOkCls =
  "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800";
export const authLinkCls =
  "inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] underline underline-offset-4 hover:no-underline";
