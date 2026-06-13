import Link from 'next/link';

import { getMessages } from '@/lib/i18n';

/** Site-wide footer with the legal links (rendered in the root layout). */
export function SiteFooter() {
  const t = getMessages();
  return (
    <footer className="site-footer">
      <nav className="site-footer-links">
        <Link href="/privacy">{t.legal.footerPrivacy}</Link>
        <span aria-hidden>·</span>
        <Link href="/terms">{t.legal.footerTerms}</Link>
      </nav>
      <p className="site-footer-rights">
        © {new Date().getFullYear()} {t.common.appName} — {t.legal.rights}
      </p>
    </footer>
  );
}
