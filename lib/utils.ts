// cn() — concaténation conditionnelle de classes (API compatible clsx).
//
// NOTE 2026-05-16 : implémenté SANS `clsx`/`tailwind-merge`. L'install
// `pnpm add clsx tailwind-merge` est bloquée par un mismatch de store pnpm
// (node_modules lié à /Users/MAPA_Claude_Code/..., pnpm veut
// /Users/julienbrebion/...). Comportement suffisant pour l'usage actuel
// (components/brand/Logo.tsx : pas de fusion de classes Tailwind
// conflictuelles requise). Si twMerge devient nécessaire ailleurs,
// restaurer la version spec via Terminal.app :
//   pnpm install && pnpm add clsx tailwind-merge
// puis remplacer ce fichier par l'implémentation clsx+twMerge.

export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue): void => {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    out.push(String(v));
  };
  inputs.forEach(walk);
  return out.join(" ");
}
