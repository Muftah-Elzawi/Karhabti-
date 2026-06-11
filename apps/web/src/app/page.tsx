import { defaultLocale, messages } from '@karhabti/i18n';

const t = messages[defaultLocale];

export default function HomePage() {
  return (
    <main>
      <h1>{t.common.appName}</h1>
      <p>{t.common.tagline}</p>
    </main>
  );
}
