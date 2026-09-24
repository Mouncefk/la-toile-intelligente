import { z } from 'zod';

export const geographicPointSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});
export const countrySchema = z.object({
  id: z.string().uuid(),
  code: z.string().length(2),
  name: z.string(),
  capital: z.string().nullable(),
});
export const placeSchema = z.object({
  id: z.string().uuid(),
  countryId: z.string().uuid(),
  name: z.string(),
  kind: z.enum(['city', 'landmark', 'region']),
  location: geographicPointSchema,
});
export const countriesQuerySchema = z.object({ q: z.string().trim().min(1).optional() });
export const placesQuerySchema = z.object({
  countryId: z.string().uuid().optional(),
  q: z.string().trim().min(1).optional(),
});
export type Country = z.infer<typeof countrySchema>;
export type Place = z.infer<typeof placeSchema>;
