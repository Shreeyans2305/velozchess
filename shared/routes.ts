import { z } from 'zod';
import { insertGameSchema, games } from './schema';

export const errorSchemas = {
  notFound: z.object({ message: z.string() }),
  badRequest: z.object({ message: z.string() }),
};

export const api = {
  games: {
    create: {
      method: 'POST' as const,
      path: '/api/games',
      input: z.object({}),
      responses: {
        201: z.custom<typeof games.$inferSelect>(),
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/games/join',
      input: z.object({ code: z.string() }),
      responses: {
        200: z.object({
          game: z.custom<typeof games.$inferSelect>(),
          role: z.enum(['w', 'b', 'spectator'])
        }),
        404: errorSchemas.notFound,
        400: errorSchemas.badRequest,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/games/:code',
      responses: {
        200: z.custom<typeof games.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
