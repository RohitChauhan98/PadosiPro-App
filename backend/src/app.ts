import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import type { PrismaClient } from '@prisma/client';
import type { Config } from './config.js';
import { AppError } from './lib/errors.js';
import type { Mailer } from './lib/mailer.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { profileRoutes } from './modules/profile/profile.routes.js';
import { tasksRoutes } from './modules/tasks/tasks.routes.js';

export interface AppDeps {
  config: Config;
  prisma: PrismaClient;
  mailer: Mailer;
}

export interface BuildAppOptions {
  logger?: boolean;
}

export async function buildApp(deps: AppDeps, options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { config } = deps;
  const app = Fastify({ logger: options.logger ?? true });

  // The Expo web dev build runs on a different origin (e.g. localhost:8083) and
  // cannot call the API without CORS headers. Auth uses Bearer tokens, not
  // cookies, so reflecting the request origin is safe here. @fastify/cors v11
  // defaults to safelisted methods only (GET/HEAD/POST) — the API uses PUT.
  await app.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyJwt, { secret: config.JWT_SECRET });

  app.decorate('authenticate', async (request: import('fastify').FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw AppError.unauthorized();
    }
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
          ...(error.extra ?? {}),
        },
      });
    }

    const statusCode =
      typeof (error as { statusCode?: unknown })?.statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (statusCode === 400) {
      // Malformed JSON bodies and other fastify-level 400s.
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message } });
    }
    if (statusCode === 401) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization token' } });
    }
    if (statusCode === 404) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
    }

    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  });

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes(deps), { prefix: '/api/auth' });
  await app.register(profileRoutes(deps), { prefix: '/api/profile' });
  await app.register(tasksRoutes(deps), { prefix: '/api' });

  return app;
}
