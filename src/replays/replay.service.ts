import { Injectable } from '@nestjs/common';
import { NewReplayDto } from './dto/new-replay.dto';
import { replayFingerprint } from './replay-fingerprint';
import { ReplayStore } from './replay.store';

export interface CreateReplayResult {
  replay: NewReplayDto;
  created: boolean;
}

@Injectable()
export class ReplayService {
  constructor(private readonly replayStore: ReplayStore) {}

  async createReplay(newReplay: NewReplayDto): Promise<CreateReplayResult> {
    const fingerprint = replayFingerprint(newReplay);
    const existing = await this.replayStore.findByFingerprint(fingerprint);
    if (existing) return { replay: existing, created: false };

    const originalId = newReplay.id;
    let candidateId = originalId;

    for (let attempt = 0; ; attempt++) {
      const candidate: NewReplayDto = {
        ...newReplay,
        id: candidateId,
        path_name:
          newReplay.path_name === originalId ? candidateId : newReplay.path_name,
      };
      const insertResult = await this.replayStore.tryInsert(candidate, fingerprint);

      if (insertResult === 'created') {
        return { replay: candidate, created: true };
      }
      if (insertResult === 'fingerprint-conflict') {
        const concurrentlyCreated =
          await this.replayStore.findByFingerprint(fingerprint);
        if (concurrentlyCreated) {
          return { replay: concurrentlyCreated, created: false };
        }
      }

      candidateId = this.nextId(originalId, attempt + 1);
    }
  }

  private nextId(originalId: string, offset: number): string {
    const match = originalId.match(/^(.*?)(\d+)$/);
    if (!match) return `${originalId}-${offset}`;

    const prefix = match[1];
    const number = Number(match[2]);
    if (!Number.isSafeInteger(number + offset)) return `${originalId}-${offset}`;
    return `${prefix}${number + offset}`;
  }

  async getReplay(id: string): Promise<NewReplayDto | null> {
    return this.replayStore.findById(id);
  }

  async getReplayLog(id: string): Promise<string | null> {
    const replay = await this.replayStore.findById(id);
    return replay?.log ?? null;
  }

  async getReplays(): Promise<NewReplayDto[]> {
    return this.replayStore.findAll();
  }
}
