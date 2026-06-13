import type { Metadata } from 'next';

import { LegalArticle } from '@/components/legal-article';
import { getMessages } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: getMessages().legal.termsTitle };
}

export default function TermsPage() {
  const t = getMessages();
  return (
    <LegalArticle
      title={t.legal.termsTitle}
      draftNotice={t.legal.draftNotice}
      paragraphs={t.legal.terms}
      lastUpdated={t.legal.lastUpdated}
      backLabel={t.common.back}
    />
  );
}
