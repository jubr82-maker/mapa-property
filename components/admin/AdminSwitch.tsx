// Interrupteur de l'admin (seconde passe, oct. 2026). Le bouton exterieur
// porte la zone tactile (44 px sur telephone, admin-mobile.css) ; la piste
// et le curseur, a l'interieur, gardent leur forme : avant, la regle des
// 44 px s'appliquait au bouton dessine lui-meme et deformait la piste.
// Ordinateur : meme dessin qu'avant (piste 40 x 24, curseur 20).
export function AdminSwitch({
  checked,
  onChange,
  disabled,
  label,
  showLabel = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  /** Libelle visible a cote de la piste (cartes du telephone). */
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={showLabel ? undefined : label}
      title={label}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      data-admin-switch
      className="inline-flex shrink-0 items-center gap-2 disabled:opacity-50"
    >
      <span
        aria-hidden
        data-track
        className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[#e0af6e]" : "bg-[#3D4F63]/20"
        }`}
      >
        <span
          data-thumb
          className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      {showLabel ? <span className="text-[14px] text-ink">{label}</span> : null}
    </button>
  );
}
