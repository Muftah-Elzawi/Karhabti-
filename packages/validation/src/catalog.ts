import { z } from 'zod';

import { governorateSchema } from './locations';
import { libyanPhoneSchema } from './phone';

/** Shared catalog + provider input contracts (API + admin UI). */

/** LYD money travels as a decimal STRING (never floats) — e.g. "25.00". */
export const moneyLydSchema = z
  .string()
  .regex(/^\d{1,8}(\.\d{1,2})?$/, { message: 'invalid_money_amount' });

export const cursorQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

export const listServicesQuerySchema = cursorQuerySchema.extend({
  category: z.string().min(1).optional(), // category slug
});
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'invalid_slug' })
  .max(60);

export const createServiceCategorySchema = z.object({
  slug: slugSchema,
  nameAr: z.string().trim().min(2).max(80),
  nameEn: z.string().trim().min(2).max(80),
  icon: z.string().max(60).optional(),
  sortOrder: z.number().int().min(0).default(0),
});
export type CreateServiceCategoryInput = z.infer<typeof createServiceCategorySchema>;

export const updateServiceCategorySchema = createServiceCategorySchema
  .partial()
  .extend({ isActive: z.boolean().optional() });
export type UpdateServiceCategoryInput = z.infer<typeof updateServiceCategorySchema>;

export const createServiceSchema = z.object({
  categoryId: z.string().min(1),
  nameAr: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  descriptionAr: z.string().trim().min(2).max(2000),
  descriptionEn: z.string().trim().min(2).max(2000),
  basePriceLYD: moneyLydSchema,
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(8 * 60),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const providerStatusSchema = z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']);
export type ProviderStatusInput = z.infer<typeof providerStatusSchema>;

export const listProvidersQuerySchema = cursorQuerySchema.extend({
  status: providerStatusSchema.optional(),
  governorate: governorateSchema.optional(),
});
export type ListProvidersQuery = z.infer<typeof listProvidersQuerySchema>;

/** Onboards an already-registered user as a service provider. */
export const createProviderSchema = z.object({
  phone: libyanPhoneSchema,
  businessName: z.string().trim().min(2).max(120),
  governorate: governorateSchema,
  serviceAreas: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});
export type CreateProviderInput = z.infer<typeof createProviderSchema>;

export const updateProviderSchema = z.object({
  businessName: z.string().trim().min(2).max(120).optional(),
  governorate: governorateSchema.optional(),
  serviceAreas: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  isVerified: z.boolean().optional(),
  status: providerStatusSchema.optional(),
});
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
