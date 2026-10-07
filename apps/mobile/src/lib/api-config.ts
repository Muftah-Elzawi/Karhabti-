/**
 * API base URL. On a physical phone, "localhost" is the phone itself — point
 * EXPO_PUBLIC_API_URL at your PC's LAN IP instead (see .env.example / README).
 */
export function normalizeBaseUrl(raw: string | undefined): string {
  return (raw ?? 'http://localhost:3001').replace(/\/+$/, '');
}

export const apiBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);

/** Joins a path onto the versioned API root, e.g. apiUrl('/auth/login'). */
export function apiUrl(path: string): string {
  return `${apiBaseUrl}/api/v1${path.startsWith('/') ? path : `/${path}`}`;
}
