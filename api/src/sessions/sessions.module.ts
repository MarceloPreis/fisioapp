import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { Session } from './session.entity';
import { SessionExercise } from './session-exercise.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Session, SessionExercise])],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
