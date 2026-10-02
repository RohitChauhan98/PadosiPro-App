import type { PrismaClient } from '@prisma/client';
import { CATALOGUE } from './catalogue.js';

/**
 * Idempotent: categories and tasks are upserted by name, so booting the API
 * repeatedly (or running `npm run prisma:seed`) never duplicates the catalogue.
 */
export async function seedCatalogue(prisma: PrismaClient): Promise<void> {
  for (const category of CATALOGUE) {
    const savedCategory = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: { name: category.name },
    });

    for (const task of category.tasks) {
      await prisma.task.upsert({
        where: { name: task.name },
        update: { description: task.description, categoryId: savedCategory.id },
        create: { name: task.name, description: task.description, categoryId: savedCategory.id },
      });
    }
  }
}