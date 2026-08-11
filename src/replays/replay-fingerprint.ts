import { createHash } from 'crypto';
import { NewReplayDto } from './dto/new-replay.dto';

export function replayFingerprint(replay: NewReplayDto): string {
  const stableContent = [
    replay.format,
    replay.players,
    replay.log,
    replay.inputlog ?? null,
  ];

  return createHash('sha256').update(JSON.stringify(stableContent)).digest('hex');
}
