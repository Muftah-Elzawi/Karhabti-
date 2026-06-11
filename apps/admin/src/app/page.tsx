import { defaultLocale, messages } from '@karhabti/i18n';

const t = messages[defaultLocale];

export default function AdminHomePage() {
  return (
    <main>
      <h1>{t.common.appName}</h1>
    </main>
  );
}
