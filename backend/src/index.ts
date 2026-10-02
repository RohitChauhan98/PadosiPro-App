import { execFileSync } from 'node:child_process';
import { buildApp } from './app.js';
import { config } from './config.js';
import { createSmtpMailer } from './lib/mailer.js';
import { prisma } from './lib/prisma.js';
import { seedCatalogue } from './seed/seed.js';

async function main(): Promise<void> {
  if (config.RUN_MIGRATIONS) {
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' });
  }

  await seedCatalogue(prisma);

  const app = await buildApp({ config, prisma, mailer: createSmtpMailer(config) });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
