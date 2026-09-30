// Source unique du positionnement de broker international de MAPA Property.
// Mission "positionnement broker international" : ce texte doit rester
// identique partout où il est utilise (page Qui sommes-nous, chatbot Elena).
// Texte FR valide par Julien, repris a l'identique. Traductions EN/DE au
// meme niveau de precision, avec les termes reellement employes dans le
// metier (Carte Professionnelle Europeenne / European Professional Card /
// Europaischer Berufsausweis, principal/mandant/Auftraggeber).
//
// Point de conformite : MAPA Property n'est habilitee a conduire elle-meme
// la negociation et la transaction qu'au Luxembourg (agence immobiliere) et,
// via la Carte Professionnelle Europeenne, en France, en Allemagne et en
// Italie. Partout ailleurs, ces actes reglementes sont realises par une
// agence locale habilitee, jamais par MAPA Property elle-meme.

export interface BrokerPositionContent {
  title: string;
  paragraphs: string[];
}

export const BROKER_POSITION: Record<"fr" | "en" | "de", BrokerPositionContent> = {
  fr: {
    title: "Notre rôle de broker international",
    paragraphs: [
      "MAPA Property représente un seul intérêt à la fois, celui de son mandant, acquéreur ou vendeur.",
      "Au Luxembourg, nous exerçons comme agence immobilière et conduisons la transaction. Nous disposons également de la carte professionnelle européenne, qui nous permet d'intervenir sur des biens situés en France, en Allemagne et en Italie.",
      "Ailleurs, nous intervenons comme broker. Les actes réglementés, dont la négociation et la transaction, sont réalisés par une agence locale habilitée que nous sélectionnons et qui représente notre mandant sur place. Notre travail est de définir précisément le besoin, d'identifier les biens, de choisir le bon partenaire local, de piloter le dossier et de rester l'interlocuteur unique de notre client jusqu'à la signature.",
      "Ce fonctionnement respecte la réglementation de chaque pays et garantit un accompagnement continu, quelle que soit la destination.",
    ],
  },
  en: {
    title: "Our role as international broker",
    paragraphs: [
      "MAPA Property represents a single interest at a time: that of its principal, whether buyer or seller.",
      "In Luxembourg, we act as a licensed real estate agency and conduct the transaction ourselves. We also hold the European Professional Card, which allows us to operate on properties located in France, Germany and Italy.",
      "Elsewhere, we act as a broker. Regulated acts, including negotiation and the transaction itself, are carried out by a licensed local agency that we select and that represents our principal on the ground. Our role is to define the requirement precisely, identify the properties, choose the right local partner, oversee the file, and remain our client's single point of contact through to signing.",
      "This model complies with the regulations of each country and ensures continuous support, wherever the destination.",
    ],
  },
  de: {
    title: "Unsere Rolle als internationaler Broker",
    paragraphs: [
      "MAPA Property vertritt jeweils nur ein Interesse: das seines Auftraggebers, ob Käufer oder Verkäufer.",
      "In Luxemburg sind wir als Immobilienagentur tätig und führen die Transaktion selbst durch. Zudem verfügen wir über den Europäischen Berufsausweis, der es uns erlaubt, bei Immobilien in Frankreich, Deutschland und Italien tätig zu werden.",
      "Andernorts treten wir als Broker auf. Die reglementierten Tätigkeiten, einschließlich der Verhandlung und der Transaktion selbst, werden von einer zugelassenen lokalen Agentur durchgeführt, die wir auswählen und die unseren Auftraggeber vor Ort vertritt. Unsere Aufgabe besteht darin, den Bedarf präzise zu definieren, die Objekte zu identifizieren, den richtigen lokalen Partner auszuwählen, den Vorgang zu steuern und bis zur Unterzeichnung der alleinige Ansprechpartner unseres Kunden zu bleiben.",
      "Dieses Vorgehen entspricht den Vorschriften jedes Landes und gewährleistet eine durchgehende Betreuung, unabhängig vom Zielland.",
    ],
  },
};
