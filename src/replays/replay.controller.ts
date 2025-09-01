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
        return await this.replayService.getReplay(id);
    }

    @Get()
    @Render("replays")
    async getReplays() {
        return await this.replayService.getReplays();
    }
}