import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { ParseUUIDPipe } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { PhysioGuard } from '../auth/physio.guard';
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewQueueDto } from './dto/review-queue.dto';
import { CreateSessionReviewDto } from './dto/create-session-review.dto';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('review-queue')
  @UseGuards(PhysioGuard)
  getReviewQueue(@Query() query: ReviewQueueDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.getReviewQueue(query, user.tenantId);
  }

  @Get(':id/reviews')
  @UseGuards(PhysioGuard)
  getReviews(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.getReviews(id, user.tenantId);
  }

  @Post(':id/reviews')
  @UseGuards(PhysioGuard)
  addReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateSessionReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sessionsService.addReview(id, body, user);
  }

  @Post()
  @UseGuards(PhysioGuard)
  create(@Body() createSessionDto: CreateSessionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.create(createSessionDto, user.tenantId);
  }

  @Get()
  findAll(@Request() req: any, @Query('isTemplate') isTemplateStr?: string) {
    if (req.user.role === 'PATIENT' && !req.user.patientId) throw new ForbiddenException();
    const patientId = req.user?.role === 'PATIENT' ? req.user.patientId : undefined;
    const isTemplate = isTemplateStr === 'true';
    return this.sessionsService.findAll(req.user.tenantId, patientId, isTemplate);
  }

  @Post('generate-week')
  @UseGuards(PhysioGuard)
  generateWeek(@CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.generateWeekSessions(user.tenantId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.sessionsService.findAuthorized(id, req.user);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateSessionDto: UpdateSessionDto, @Request() req: any) {
    await this.sessionsService.findAuthorized(id, req.user);
    if (req.user.role !== 'PHYSIO' && [updateSessionDto.title, updateSessionDto.scheduledDate, updateSessionDto.recurrenceDays, updateSessionDto.exercises].some(value => value !== undefined)) throw new ForbiddenException();
    return this.sessionsService.update(id, updateSessionDto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(PhysioGuard)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.remove(id, user.tenantId);
  }
}
