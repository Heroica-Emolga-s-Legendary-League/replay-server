import { ConflictException } from '@nestjs/common';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ReplayService } from './replay.service';
import { NewReplayDto } from './dto/new-replay.dto';

describe('ReplayService', () => {
  let service: ReplayService;
  let tempDirPath: string;

  const createReplay = (
    id: string,
    log: string,
    players: string[] = ['alpha', 'beta'],
  ): NewReplayDto => ({
    id,
    log,
    players,
    format: '[Gen 9] NatDex Draft',
    rating: null as unknown as string,
    private: '0',
    password: null as unknown as string,
    inputlog: '',
    uploadtime: '1723334400',
    path_name: `/replays/${id}`,
  });

  beforeEach(async () => {
    tempDirPath = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'replay-service-spec-'),
    );
    service = new ReplayService();
    Object.defineProperty(service, 'replayDirPath', {
      value: tempDirPath,
    });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDirPath, { recursive: true, force: true });
  });

  it('throws ConflictException on duplicate ids and preserves original bytes', async () => {
    const firstReplay = createReplay('duplicate-replay', 'first log');
    const secondReplay = createReplay('duplicate-replay', 'second log');
    const replayPath = path.join(tempDirPath, `${firstReplay.id}.json`);
    const originalBytes = Buffer.from(JSON.stringify(firstReplay));

    await fs.promises.writeFile(replayPath, originalBytes);

    await expect(service.createReplay(secondReplay)).rejects.toThrow(
      ConflictException,
    );

    const currentBytes = await fs.promises.readFile(replayPath);
    expect(currentBytes.equals(originalBytes)).toBe(true);
  });
});
