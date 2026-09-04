import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Render } from "@nestjs/common";
import { NewReplayDto } from "./dto/new-replay.dto";
import { ReplayService } from "./replay.service";

@Controller('replays')
export class ReplayController {
    constructor(private readonly replayService: ReplayService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createReplay(@Body() newReplay: NewReplayDto) {
        const result = await this.replayService.createReplay(newReplay);
        return {
            id: result.replay.id,
            path_name: result.replay.path_name,
            created: result.created,
            queued: result.queued,
        };
    }

    @Get(':id.log')
    async getReplayLog(@Param('id') id: string) {
        const replayLog = await this.replayService.getReplayLog(id);
        return replayLog?.replaceAll('\n', '<br>') || "LOG NOT FOUND";
    }

    @Get(':id')
    @Render("replay")
    async getReplay(@Param('id') id: string) {
        const replay = await this.replayService.getReplay(id);
        if (!replay) {
            throw new NotFoundException(`Replay with id '${id}' not found`);
        }
        return { replay };
    }

    @Get()
    @Render("replays")
    async getReplays() {
        const replays = await this.replayService.getReplays();
        return { replays };
    }
}
