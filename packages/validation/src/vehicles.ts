import { z } from 'zod';

/** Shared vehicle input contracts — the companion-layer foundation. */

const currentYear = new Date().getFullYear();

const vehicleFields = {
  makeId: z.string().min(1),
  modelId: z.string().min(1),
  year: z
    .number()
    .int()
    .min(1980, 'invalid_year')
    .max(currentYear + 1, 'invalid_year'),
  engine: z.string().trim().max(20).optional(),
  nickname: z.string().trim().min(1).max(40).optional(),
  plateNumber: z.string().trim().max(20).optional(),
  mileageKm: z.number().int().min(0).max(2_000_000),
  color: z.string().trim().max(30).optional(),
};

export const createVehicleSchema = z.object(vehicleFields);
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

/**
 * make/model travel together: changing the model requires both ids so the
 * pair can be validated against the catalog.
 */
export const updateVehicleSchema = z
  .object({
    ...vehicleFields,
    makeId: vehicleFields.makeId.optional(),
    modelId: vehicleFields.modelId.optional(),
    year: vehicleFields.year.optional(),
    mileageKm: vehicleFields.mileageKm.optional(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'empty_update' })
  .refine((value) => (value.makeId === undefined) === (value.modelId === undefined), {
    message: 'make_model_pair_required',
    path: ['modelId'],
  });
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
