import { z } from 'zod';

import { citiesByGovernorate, governorateSchema } from './locations';

/** Shared address input contracts (Tripoli/Benghazi launch coverage). */

const addressFields = {
  label: z.string().trim().min(1).max(40), // e.g. "المنزل", "العمل"
  governorate: governorateSchema,
  city: z.string().min(1),
  area: z.string().trim().min(2).max(80),
  details: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
};

const cityBelongsToGovernorate = (value: { governorate?: string; city?: string }): boolean => {
  if (value.governorate === undefined || value.city === undefined) return true;
  const cities = citiesByGovernorate[value.governorate as keyof typeof citiesByGovernorate];
  return (cities as readonly string[] | undefined)?.includes(value.city) ?? false;
};

const latLngTogether = (value: { lat?: number; lng?: number }): boolean =>
  (value.lat === undefined) === (value.lng === undefined);

export const createAddressSchema = z
  .object(addressFields)
  .refine(cityBelongsToGovernorate, { message: 'city_not_in_governorate', path: ['city'] })
  .refine(latLngTogether, { message: 'lat_lng_pair_required', path: ['lng'] });
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

/** governorate/city travel together so the pair can be validated. */
export const updateAddressSchema = z
  .object(addressFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'empty_update' })
  .refine((value) => (value.governorate === undefined) === (value.city === undefined), {
    message: 'governorate_city_pair_required',
    path: ['city'],
  })
  .refine(cityBelongsToGovernorate, { message: 'city_not_in_governorate', path: ['city'] })
  .refine(latLngTogether, { message: 'lat_lng_pair_required', path: ['lng'] });
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
