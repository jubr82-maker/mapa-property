// Donnees structurees des mentions legales (nov. 2026). Complement de
// l'etablissement unique (#organization, lib/seo.ts) publie UNIQUEMENT sur
// la page des mentions legales : TVA, RCS et autorisation d'etablissement
// (regle du projet : ces numeros seulement dans les mentions legales et
// lib/legal/). Meme @id que le bloc du layout, donc la meme entite pour
// Google. Valeurs recopiees de lib/legal/mentions.ts.
// Controle Google du 13/11/2026 : le bloc n'avait pas de @type (signale
// "donnees structurees sans type"). Il porte desormais le meme type que
// l'etablissement (RealEstateAgent), son nom, son adresse publique
// (Dudelange, ORGANIZATION_ADDRESS) et son adresse web : un noeud complet
// en lui-meme, fusionne par Google avec celui du layout (meme @id).
import { ORGANIZATION_ADDRESS } from "@/lib/seo";

const LEGAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

export function legalNoticeOrganization(siteUrl: string = LEGAL_SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${siteUrl}#organization`,
    name: "MAPA Property",
    url: siteUrl,
    address: ORGANIZATION_ADDRESS,
    vatID: "LU31988923",
    identifier: [
      { "@type": "PropertyValue", propertyID: "RCS Luxembourg", value: "B241974" },
      { "@type": "PropertyValue", propertyID: "Autorisation d'établissement", value: "10108681/0-1-2-3" },
    ],
  };
}
