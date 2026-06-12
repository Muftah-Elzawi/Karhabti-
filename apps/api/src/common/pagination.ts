import type { ApiEnvelope, PageMeta } from '@karhabti/types';

/**
 * Cursor pagination convention (KARHABTI_BUILD_PROMPT.md §6): repositories
 * fetch `limit + 1` rows ordered by id; the extra row signals another page
 * and its predecessor's id becomes the cursor.
 */
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export function buildPage<T extends { id: string }>(rows: T[], limit: number): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  return {
    items,
    meta: { hasMore, nextCursor: hasMore && lastItem ? lastItem.id : null },
  };
}

/** Wraps a page into the standard envelope (passes through the interceptor untouched). */
export function pageEnvelope<T, R>(page: Page<T>, map: (item: T) => R): ApiEnvelope<R[], PageMeta> {
  return { data: page.items.map(map), meta: page.meta, error: null };
}

/** Prisma `findMany` args for a cursor page (id-ordered). */
export function cursorArgs(cursor: string | undefined, limit: number) {
  return {
    take: limit + 1,
    orderBy: { id: 'asc' as const },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}
