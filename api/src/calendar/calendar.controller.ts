import { Controller, Get, UseGuards, GoneException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PhysioGuard } from '../auth/physio.guard';
@UseGuards(JwtAuthGuard, PhysioGuard)
@Controller('calendar')
export class CalendarController {
  @Get('auth') auth(): never { throw new GoneException('Use a agenda local.'); }
  @Get('auth/callback') callback(): never { throw new GoneException('Use a agenda local.'); }
}
