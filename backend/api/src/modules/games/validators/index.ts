import { z } from 'zod';

export const startGameSchema = z.object({ gameId: z.string().uuid() });

export const submitScoreSchema = z.object({
  score: z.coerce.number().int().min(0).max(1_000_000),
});

export const listHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const gameIdParamsSchema = z.object({ id: z.string().uuid() });
