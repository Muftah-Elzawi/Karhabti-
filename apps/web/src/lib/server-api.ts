import { ApiError, apiFetch } from './api';
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
