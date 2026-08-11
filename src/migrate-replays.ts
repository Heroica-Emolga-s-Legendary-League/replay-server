import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ReplayMigrationService } from './replays/replay-migration.service';

async function migrate(): Promise<void> {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const result = await app.get(ReplayMigrationService).migrate();
    console.log(JSON.stringify(result, null, 2));
    if (result.conflicts.length || result.invalid.length) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void migrate();
