/**
 * PropertyMagazineDescription
 * Affichage éditorial "magazine" (type Architectural Digest) :
 * - 1er paragraphe = lead en italic font-display
 * - paragraphes suivants en colonne lisible (max-width 720px, leading 1.8)
 * - lettrine sur le 1er paragraphe non-lead (copper #B8865A, exception au token CSS)
 *
 * Server Component. Ne rend rien si description vide.
 */
interface Props {
  description: string;
}

export function PropertyMagazineDescription({ description }: Props) {
  const paragraphs = description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  // Si un seul paragraphe, on l'affiche en lead + lettrine sur lui-même.
  if (paragraphs.length === 1) {
    return (
      <div className="magazine-content mx-auto max-w-[720px]">
        <p className="text-base leading-[1.8] text-ink-mid first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-[4rem] first-letter:font-bold first-letter:leading-[0.8] first-letter:text-[#B8865A]">
          {paragraphs[0]}
        </p>
      </div>
    );
  }

  const [lead, ...rest] = paragraphs;

  return (
    <div className="magazine-content mx-auto max-w-[720px]">
      <p className="font-display text-[1.3rem] italic leading-snug text-ink-mid">
        {lead}
      </p>
      {rest.map((para, i) => (
        <p
          key={i}
          className={
            i === 0
              ? "mt-6 text-base leading-[1.8] text-ink-mid first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-[4rem] first-letter:font-bold first-letter:leading-[0.8] first-letter:text-[#B8865A]"
              : "mt-6 text-base leading-[1.8] text-ink-mid"
          }
        >
          {para}
        </p>
      ))}
    </div>
  );
}
