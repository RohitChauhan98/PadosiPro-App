import type { FastifyPluginAsync } from 'fastify';
import type { Profile } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { parseWith } from '../../lib/validate.js';
import type { AppDeps } from '../../app.js';
import { upsertProfileBodySchema } from './profile.schemas.js';

function toProfileResponse(profile: Profile) {
  return {
    name: profile.name,
    mobileNumber: profile.mobileNumber,
    address: profile.address,
    businessName: profile.businessName,
  };
}

export function profileRoutes(deps: AppDeps): FastifyPluginAsync {
  const { prisma } = deps;

  return async (app) => {
    app.get('/', { preHandler: [app.authenticate] }, async (request) => {
      const profile = await prisma.profile.findUnique({ where: { userId: request.user.sub } });
      if (!profile) {
        throw AppError.notFound('Profile not found');
      }
      return toProfileResponse(profile);
    });

    app.put('/', { preHandler: [app.authenticate] }, async (request) => {
      const body = parseWith(upsertProfileBodySchema, request.body);

      const profile = await prisma.profile.upsert({
        where: { userId: request.user.sub },
        create: { userId: request.user.sub, ...body },
        update: body,
      });

      return toProfileResponse(profile);
    });
  };
}
