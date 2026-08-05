import { Injectable } from "@nestjs/common";
import { NewReplayDto } from "./dto/new-replay.dto";
import fs from 'fs';
import path from "path";

@Injectable()
export class ReplayService {
    private readonly replayDirPath = path.resolve(process.cwd(), 'data', 'replays');

    constructor() {}

    async createReplay(newReplay: NewReplayDto) {
        await fs.promises.mkdir(this.replayDirPath, { recursive: true });
        await fs.promises.writeFile(path.join(this.replayDirPath, `${newReplay.id}.json`), JSON.stringify(newReplay), { flag: 'w' });
    }

    async getReplay(id: string): Promise<NewReplayDto | null> {
        try {
            const data = await fs.promises.readFile(path.join(this.replayDirPath, `${id}.json`), 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    async getReplayLog(id: string): Promise<string | null> {
        try {
            const data = await fs.promises.readFile(path.join(this.replayDirPath, `${id}.json`), 'utf-8');
            const json = JSON.parse(data);
            return json.log || "REPLAY NOT FOUND";
        } catch (error) {
            return null;
        }
    }

    async getReplays() {
        const files = await fs.promises.readdir(this.replayDirPath);
        const replays: NewReplayDto[] = [];

        for (const file of files) {
            const data = await fs.promises.readFile(path.join(this.replayDirPath, file), 'utf-8');
            replays.push(JSON.parse(data));
        }

        return replays;
    }
}