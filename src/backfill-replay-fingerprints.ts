import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ReplayStore } from './replays/replay.store';

async function backfill(): Promise<void> {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const result = await app.get(ReplayStore).backfillFingerprints();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

void backfill();
