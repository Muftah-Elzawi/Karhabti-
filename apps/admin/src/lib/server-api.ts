import type { PageMeta } from '@karhabti/types';

import { ApiError, apiFetch, apiFetchPage } from './api';
import { getAccessToken } from './session';

/**
 * Authenticated server-side call — attaches the access token from the
 * httpOnly cookie. Server components and BFF route handlers only.
 */
export async function apiFetchAuthed<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError('UNAUTHORIZED', 401);
  return apiFetch<T>(path, {
    ...init,
    headers: { ...init?.headers, authorization: `Bearer ${token}` },
  });
}

/** Authenticated page fetch — keeps cursor meta for "load more" links. */
export async function apiFetchPageAuthed<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta: PageMeta | null }> {
  const token = getAccessToken();
  if (!token) throw new ApiError('UNAUTHORIZED', 401);
  return apiFetchPage<T>(path, {
    ...init,
    headers: { ...init?.headers, authorization: `Bearer ${token}` },
  });
}
