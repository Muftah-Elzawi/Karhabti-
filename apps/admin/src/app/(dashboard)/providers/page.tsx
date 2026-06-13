import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { OnboardProviderForm } from '@/components/providers/onboard-provider-form';
import { ProviderRowActions } from '@/components/providers/provider-row-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProviderDto, ProviderStatus } from '@/lib/api';
import { getMessages } from '@/lib/i18n';
import { apiFetchAuthed } from '@/lib/server-api';

export function generateMetadata(): Metadata {
  return { title: getMessages().admin.navProviders };
}

const STATUS_CLASS: Record<ProviderStatus, string> = {
  PENDING: 'bg-secondary text-secondary-foreground',
  ACTIVE: 'bg-success text-success-foreground',
  SUSPENDED: 'bg-destructive text-destructive-foreground',
};

export default async function AdminProvidersPage() {
  const t = getMessages();

  let providers: ProviderDto[];
  try {
    providers = await apiFetchAuthed<ProviderDto[]>('/admin/providers?limit=50');
  } catch {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <OnboardProviderForm t={t} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t.admin.navProviders}</CardTitle>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.admin.empty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.businessName}</TableHead>
                  <TableHead>{t.auth.phone}</TableHead>
                  <TableHead>{t.booking.governorate}</TableHead>
                  <TableHead>{t.admin.rating}</TableHead>
                  <TableHead>{t.admin.verified}</TableHead>
                  <TableHead>{t.admin.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">
                      {provider.businessName}
                      <div className="pt-1">
                        <Badge
                          variant="outline"
                          className={`border-transparent ${STATUS_CLASS[provider.status]}`}
                        >
                          {t.admin.providerStatus[provider.status]}
                        </Badge>
                      </div>
                      {provider.serviceAreas.length > 0 ? (
                        <p className="max-w-44 truncate pt-1 text-xs text-muted-foreground">
                          {provider.serviceAreas.join('، ')}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {provider.user.displayName}
                      <p className="text-xs text-muted-foreground">
                        <bdi dir="ltr">{provider.user.phone}</bdi>
                      </p>
                    </TableCell>
                    <TableCell>
                      {t.locations[provider.governorate as 'tripoli' | 'benghazi'] ??
                        provider.governorate}
                    </TableCell>
                    <TableCell>{provider.rating ?? '—'}</TableCell>
                    <TableCell>
                      {provider.isVerified ? (
                        <Badge className="border-transparent bg-success text-success-foreground">
                          {t.admin.verified}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t.admin.notVerified}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ProviderRowActions provider={provider} t={t} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
