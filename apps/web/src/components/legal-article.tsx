import Link from 'next/link';

/** Renders a localized legal document (privacy / terms) from i18n paragraphs. */
export function LegalArticle({
  title,
  draftNotice,
  paragraphs,
  lastUpdated,
  backLabel,
}: {
  title: string;
  draftNotice: string;
  paragraphs: readonly string[];
  lastUpdated: string;
  backLabel: string;
}) {
  return (
    <main className="page">
      <div className="page-head">
        <h1 className="title">{title}</h1>
        <Link href="/" className="btn btn-ghost">
          {backLabel}
        </Link>
      </div>

      <div className="card">
        <p className="form-notice">{draftNotice}</p>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="legal-p">
            {paragraph}
          </p>
        ))}
        <p className="tagline">{lastUpdated}</p>
      </div>
    </main>
  );
}
