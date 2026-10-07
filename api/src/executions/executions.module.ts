import { SessionsModule } from '../sessions/sessions.module';
import { VideosModule } from '../videos/videos.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { SessionExecution } from './execution.entity';
import { ExecutionNote } from './execution-note.entity';

@Module({
  imports: [SessionsModule, VideosModule, TypeOrmModule.forFeature([SessionExecution, ExecutionNote])],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
})
export class ExecutionsModule {}
