import { z } from 'zod';

/**
 * Launch coverage: Tripoli and Benghazi.
 * Rolling out a new city = add it here (+ display names in @karhabti/i18n);
 * the DB stores these slugs as plain strings, so no migration is needed.
 */
export const governorates = ['tripoli', 'benghazi'] as const;

export const governorateSchema = z.enum(governorates);
export type Governorate = z.infer<typeof governorateSchema>;

export const citiesByGovernorate = {
  tripoli: ['tripoli'],
  benghazi: ['benghazi'],
} as const satisfies Record<Governorate, readonly [string, ...string[]]>;

export const citySchema = z.enum(['tripoli', 'benghazi']);
export type City = z.infer<typeof citySchema>;
