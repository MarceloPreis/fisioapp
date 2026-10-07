import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [CalendarService],
  controllers: [CalendarController],
  exports: [CalendarService]
})
export class CalendarModule {}
