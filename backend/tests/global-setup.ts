import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { seedCatalogue } from '../src/seed/seed.js';

export const TEST_DATABASE_URL = 'file:./test.db';

export default async function globalSetup(): Promise<void> {
  // Throwaway local SQLite file per run; schema comes from the committed migrations
  // via `migrate deploy` — the same non-destructive path the API uses on boot.
  rmSync(path.resolve(process.cwd(), 'prisma/test.db'), { force: true });
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
  const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
  await seedCatalogue(prisma);
  await prisma.$disconnect();
}
