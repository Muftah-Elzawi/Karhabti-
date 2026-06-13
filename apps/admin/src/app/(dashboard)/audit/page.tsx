import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuditFilter } from '@/components/audit/audit-filter';
import { JsonDiff } from '@/components/audit/json-diff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AuditLogDto } from '@/lib/api';
import { getLocale, getMessages } from '@/lib/i18n';
import { apiFetchPageAuthed } from '@/lib/server-api';

export function generateMetadata(): Metadata {
  return { title: getMessages().admin.navAudit };
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { entityType?: string; entityId?: string; cursor?: string };
}) {
  const t = getMessages();
  const locale = getLocale();

  const query = new URLSearchParams({ limit: '50' });
  if (searchParams.entityType) query.set('entityType', searchParams.entityType);
  if (searchParams.entityId) query.set('entityId', searchParams.entityId);
  if (searchParams.cursor) query.set('cursor', searchParams.cursor);

  let logs: AuditLogDto[];
  let nextCursor: string | null;
  try {
    const page = await apiFetchPageAuthed<AuditLogDto[]>(`/admin/audit-logs?${query.toString()}`);
    logs = page.data;
    nextCursor = page.meta?.nextCursor ?? null;
  } catch {
    redirect('/login');
  }

  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LY' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // "Load older" preserves the active entity filters.
  const olderParams = new URLSearchParams();
  if (searchParams.entityType) olderParams.set('entityType', searchParams.entityType);
  if (searchParams.entityId) olderParams.set('entityId', searchParams.entityId);
  if (nextCursor) olderParams.set('cursor', nextCursor);

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="text-xl">{t.admin.navAudit}</CardTitle>
        <AuditFilter t={t} />
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.admin.empty}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.time}</TableHead>
                  <TableHead>{t.admin.actor}</TableHead>
                  <TableHead>{t.admin.action}</TableHead>
                  <TableHead>{t.admin.entity}</TableHead>
                  <TableHead>{t.admin.changes}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      <bdi dir="ltr">{dateFormat.format(new Date(log.createdAt))}</bdi>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.actor ? (
                        <>
                          {log.actor.displayName}
                          <p className="text-muted-foreground">
                            <bdi dir="ltr">{log.actor.phone}</bdi>
                          </p>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{t.admin.system}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code dir="ltr" className="text-xs">
                        {log.action}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.entityType}
                      <p className="text-muted-foreground">
                        <bdi dir="ltr">{log.entityId}</bdi>
                      </p>
                    </TableCell>
                    <TableCell>
                      <JsonDiff
                        before={log.before}
                        after={log.after}
                        beforeLabel={t.admin.before}
                        afterLabel={t.admin.after}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {nextCursor ? (
              <div className="flex justify-center pt-4">
                <Link
                  href={`/audit?${olderParams.toString()}`}
                  className="rounded-md border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  {t.admin.loadOlder}
                </Link>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
