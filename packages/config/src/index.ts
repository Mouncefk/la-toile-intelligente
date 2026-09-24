import { z } from 'zod';

const environmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  API_PORT: z.coerce.number().int().positive().default(3001),
});
export type Environment = z.infer<typeof environmentSchema>;
export const loadEnvironment = (input: NodeJS.ProcessEnv = process.env): Environment =>
  environmentSchema.parse(input);
