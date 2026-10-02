import { PrismaClient } from '@prisma/client';
import { seedCatalogue } from './seed.js';

const prisma = new PrismaClient();

seedCatalogue(prisma)
  .then(async () => {
    const [categories, tasks] = await Promise.all([prisma.category.count(), prisma.task.count()]);
    console.log(`Seed complete: ${categories} categories, ${tasks} tasks`);
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
