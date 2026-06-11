import { z } from 'zod';

export * from './auth';
export * from './locations';
export * from './phone';

export const localeSchema = z.enum(['ar', 'en']);
