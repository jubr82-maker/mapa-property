"use client";

// Coordonnees de la carte conseiller imprimee (oct. 2026, decision de
// Julien). Le HTML servi ne contient ni telephone, ni e-mail, ni lien
// tel: ou mailto: : ils ne s'affichent a l'impression que si le visiteur
// les a reveles d'un clic (ContactReveal) ; sinon, une phrase renvoie au
// bouton "Nous contacter" de l'annonce en ligne.
import { advisorContact, useContactRevealed } from "@/components/contact-reveal";

interface Props {
  labels: {
    hint: string;
    /** Gabarits contenant {value}. */
    phone: string;
    email: string;
  };
}

export function PrintAdvisorContact({ labels }: Props) {
  const revealed = useContactRevealed();
  if (!revealed) return <p className="mt-3 text-sm">{labels.hint}</p>;
  const { phone, email } = advisorContact();
  return (
    <>
      <p className="mt-3 text-sm">{labels.phone.replace("{value}", phone)}</p>
      <p className="text-sm">{labels.email.replace("{value}", email)}</p>
    </>
  );
}
