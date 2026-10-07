import type { ReactNode } from 'react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { LogoutButton } from '@/components/logout-button';
import { NavLink } from '@/components/nav-link';
import { getMessages } from '@/lib/i18n';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const t = getMessages();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <span className="text-lg font-semibold text-primary">{t.common.appName}</span>
          <span className="text-sm text-muted-foreground">{t.admin.dashboard}</span>

          <nav className="ms-4 flex items-center gap-1">
            <NavLink href="/bookings">{t.admin.navBookings}</NavLink>
            <NavLink href="/providers">{t.admin.navProviders}</NavLink>
            <NavLink href="/audit">{t.admin.navAudit}</NavLink>
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitcher />
            <LogoutButton label={t.auth.logout} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
