import { Module } from '@nestjs/common';
import { ReplayController } from './replay.controller';
import { ReplayService } from './replay.service';
import { ReplayStore } from './replay.store';
import { ReplayMigrationService } from './replay-migration.service';

@Module({
    controllers: [ReplayController],
    providers: [ReplayService, ReplayStore, ReplayMigrationService],
    exports: [ReplayMigrationService, ReplayStore],
})
export class ReplayModule {}
