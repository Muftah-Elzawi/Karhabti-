import type { Metadata } from 'next';

import { LegalArticle } from '@/components/legal-article';
import { getMessages } from '@/lib/i18n';

export function generateMetadata(): Metadata {
  return { title: getMessages().legal.privacyTitle };
}

export default function PrivacyPage() {
  const t = getMessages();
  return (
    <LegalArticle
      title={t.legal.privacyTitle}
      draftNotice={t.legal.draftNotice}
      paragraphs={t.legal.privacy}
      lastUpdated={t.legal.lastUpdated}
      backLabel={t.common.back}
    />
  );
}
