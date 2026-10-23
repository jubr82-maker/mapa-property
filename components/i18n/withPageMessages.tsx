// Traductions envoyees au navigateur PAR PAGE (oct. 2026, quotas Vercel).
// Le layout ne transmet que les namespaces de ses propres composants client
// (LAYOUT_CLIENT_NAMESPACES) ; chaque page qui a des composants client
// traduits enveloppe son contenu d'un second fournisseur avec ses seuls
// namespaces. Un fournisseur imbrique remplace les messages du parent (il ne
// les fusionne pas) : il ne sert qu'aux composants de la page, ceux du layout
// gardent le fournisseur du layout. Listes verifiees par
// scripts/seo/test-client-messages.mts (calcul depuis les imports).
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { pickMessages } from "@/lib/i18n-client-messages";

export function withPageMessages<P>(Page: (props: P) => Promise<ReactNode> | ReactNode, namespaces: readonly string[]) {
  return async function PageWithMessages(props: P) {
    const content = await Page(props);
    const [locale, all] = await Promise.all([getLocale(), getMessages()]);
    return (
      <NextIntlClientProvider locale={locale} messages={pickMessages(all as Record<string, unknown>, namespaces)}>
        {content}
      </NextIntlClientProvider>
    );
  };
}
