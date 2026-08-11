import { Injectable } from '@nestjs/common';
import { NewReplayDto } from './dto/new-replay.dto';
import { ReplayStore } from './replay.store';

@Injectable()
export class ReplayService {
  constructor(private readonly replayStore: ReplayStore) {}

  async createReplay(newReplay: NewReplayDto): Promise<NewReplayDto> {
    const originalId = newReplay.id;
    let candidateId = originalId;

    for (let attempt = 0; ; attempt++) {
      const candidate: NewReplayDto = {
        ...newReplay,
        id: candidateId,
        path_name:
          newReplay.path_name === originalId ? candidateId : newReplay.path_name,
      };

      if (await this.replayStore.insert(candidate)) {
        return candidate;
      }

      const existing = await this.replayStore.findById(candidateId);
      if (existing && this.samePlayers(existing.players, candidate.players)) {
        return existing;
      }

      candidateId = this.nextId(originalId, attempt + 1);
    }
  }

  private samePlayers(existing: string[], requested: string[]): boolean {
    return (
      existing.length === requested.length &&
      existing.every((player, index) => player === requested[index])
    );
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
