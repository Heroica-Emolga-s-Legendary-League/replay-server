import { Body, Controller, Get, Param, Post, Render } from "@nestjs/common";
import { NewReplayDto } from "./dto/new-replay.dto";
import { ReplayService } from "./replay.service";

@Controller('replays')
export class ReplayController {
    constructor(private readonly replayService: ReplayService) {}

    @Post()
    async createReplay(@Body() newReplay: NewReplayDto) {
        await this.replayService.createReplay(newReplay);
    }

    @Get(':id')
    @Render("replay")
    async getReplay(@Param('id') id: string) {
        const replay = await this.replayService.getReplay(id);
        return { replay };
    }

    @Get()
    @Render("replays")
    async getReplays() {
        const replays = await this.replayService.getReplays();
        return { replays };
    }
}