import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReplayModule } from './replays/replay.module';

@Module({
  imports: [ReplayModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
