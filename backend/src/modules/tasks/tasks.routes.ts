import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import { parseWith } from '../../lib/validate.js';
import type { AppDeps } from '../../app.js';

const putUserTasksBodySchema = z.object({
  taskIds: z.array(z.string().min(1), { required_error: 'taskIds is required' }).max(100, 'taskIds is too large'),
});

export function tasksRoutes(deps: AppDeps): FastifyPluginAsync {
  const { prisma } = deps;

  async function getUserTasks(userId: string) {
    const selections = await prisma.userTask.findMany({
      where: { userId },
      include: { task: { include: { category: true } } },
      orderBy: { task: { name: 'asc' } },
    });
    return {
      tasks: selections.map(({ task }) => ({
        id: task.id,
        name: task.name,
        description: task.description,
        category: { id: task.category.id, name: task.category.name },
      })),
    };
  }

  return async (app) => {
    app.get('/tasks', { preHandler: [app.authenticate] }, async () => {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { tasks: { orderBy: { name: 'asc' }, select: { id: true, name: true, description: true } } },
      });
      return { categories };
    });

    app.get('/users/me/tasks', { preHandler: [app.authenticate] }, async (request) => {
      return getUserTasks(request.user.sub);
    });

    app.put('/users/me/tasks', { preHandler: [app.authenticate] }, async (request) => {
      const { taskIds } = parseWith(putUserTasksBodySchema, request.body);
      const uniqueIds = [...new Set(taskIds)];

      const found = await prisma.task.findMany({ where: { id: { in: uniqueIds } }, select: { id: true } });
      if (found.length !== uniqueIds.length) {
        const foundIds = new Set(found.map((task) => task.id));
        const missing = uniqueIds.filter((id) => !foundIds.has(id));
        throw AppError.validation(
          'Some taskIds do not exist',
          missing.map((id) => ({ field: 'taskIds', message: `Unknown task id: ${id}` })),
        );
      }

      await prisma.$transaction([
        prisma.userTask.deleteMany({ where: { userId: request.user.sub } }),
        prisma.userTask.createMany({ data: uniqueIds.map((taskId) => ({ userId: request.user.sub, taskId })) }),
      ]);

      return getUserTasks(request.user.sub);
    });
  };
}
