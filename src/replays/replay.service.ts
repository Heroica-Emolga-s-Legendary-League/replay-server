import { Injectable } from "@nestjs/common";
import { NewReplayDto } from "./dto/new-replay.dto";
import fs from 'fs';

@Injectable()
export class ReplayService {
    constructor() {}

    async createReplay(newReplay: NewReplayDto) {
        await fs.writeFileSync('./data/replays/' + newReplay.id + '.json', JSON.stringify(newReplay));
    }

    async getReplay(id: string): Promise<NewReplayDto | null> {
        try {
            const data = await fs.promises.readFile('./data/replays/' + id + '.json', 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    async getReplays() {
        const files = await fs.promises.readdir('./data/replays');
        const replays: NewReplayDto[] = [];

        for (const file of files) {
            const data = await fs.promises.readFile('./data/replays/' + file, 'utf-8');
            replays.push(JSON.parse(data));
        }

        return replays;
    }
}