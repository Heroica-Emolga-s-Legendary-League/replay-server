import { Injectable, Logger } from '@nestjs/common';
import { constants as fsConstants, promises as fs } from 'fs';
import { isDeepStrictEqual } from 'util';
import path from 'path';
import { NewReplayDto } from './dto/new-replay.dto';
import { ReplayStore } from './replay.store';

export interface MigrationResult {
  imported: number;
  alreadyImported: number;
  conflicts: string[];
  invalid: string[];
}

@Injectable()
export class ReplayMigrationService {
  private readonly logger = new Logger(ReplayMigrationService.name);
  private readonly dataDir = process.env.REPLAY_DATA_DIR
    ? path.resolve(process.env.REPLAY_DATA_DIR)
    : path.resolve(process.cwd(), 'data');
  private readonly sourceDir = path.join(this.dataDir, 'replays');
  private readonly archiveDir = path.join(this.dataDir, 'replays-migrated');

  constructor(private readonly replayStore: ReplayStore) {}

  // Persists a replay to the same directory `migrate()` reads from, for use when MongoDB is unreachable.
  async enqueue(replay: NewReplayDto): Promise<void> {
    await fs.mkdir(this.sourceDir, { recursive: true });
    const contents = JSON.stringify(replay, null, 2);
    try {
      await fs.writeFile(path.join(this.sourceDir, `${replay.id}.json`), contents, {
        flag: 'wx',
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      await fs.writeFile(
        path.join(this.sourceDir, `${replay.id}-${Date.now()}.json`),
        contents,
        { flag: 'wx' },
      );
    }
  }

  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      imported: 0,
      alreadyImported: 0,
      conflicts: [],
      invalid: [],
    };

    await fs.mkdir(this.sourceDir, { recursive: true });
    await fs.mkdir(this.archiveDir, { recursive: true });
    const files = (await fs.readdir(this.sourceDir)).filter((file) => file.endsWith('.json'));

    for (const file of files) {
      const sourcePath = path.join(this.sourceDir, file);
      let replay: NewReplayDto;
      try {
        replay = JSON.parse(await fs.readFile(sourcePath, 'utf8')) as NewReplayDto;
        if (!replay.id || typeof replay.id !== 'string') {
          throw new Error('missing string id');
        }
      } catch (error) {
        result.invalid.push(file);
        this.logger.error(`Skipping invalid replay ${file}: ${String(error)}`);
        continue;
      }

      const inserted = await this.replayStore.insert(replay);
      if (inserted) {
        const saved = await this.replayStore.findById(replay.id);
        if (!isDeepStrictEqual(saved, replay)) {
          throw new Error(`Verification failed after importing ${file}; source was preserved`);
        }
        result.imported++;
      } else {
        const saved = await this.replayStore.findById(replay.id);
        if (!isDeepStrictEqual(saved, replay)) {
          result.conflicts.push(file);
          this.logger.error(`Conflict for ${file}; source was preserved and MongoDB was not changed`);
          continue;
        }
        result.alreadyImported++;
      }

      await this.archiveWithoutOverwrite(sourcePath, path.join(this.archiveDir, file));
    }

    return result;
  }

  private async archiveWithoutOverwrite(source: string, destination: string): Promise<void> {
    try {
      await fs.copyFile(source, destination, fsConstants.COPYFILE_EXCL);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const [sourceBytes, destinationBytes] = await Promise.all([
        fs.readFile(source),
        fs.readFile(destination),
      ]);
      if (!sourceBytes.equals(destinationBytes)) {
        throw new Error(`Archive conflict at ${destination}; source was preserved`);
      }
    }

    const [sourceBytes, destinationBytes] = await Promise.all([
      fs.readFile(source),
      fs.readFile(destination),
    ]);
    if (!sourceBytes.equals(destinationBytes)) {
      throw new Error(`Archive verification failed for ${destination}; source was preserved`);
    }
    await fs.unlink(source);
  }
}
