import { ParseUUIDPipe } from '@nestjs/common';
import { PhysioGuard } from '../auth/physio.guard';
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { CreateExecutionDto } from './dto/execution.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post()
  create(@Body() createExecutionDto: CreateExecutionDto, @Request() req: any) {
    return this.executionsService.create(createExecutionDto, req.user);
  }

  @Get('session/:sessionId')
  findAllBySession(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Request() req: any) {
    return this.executionsService.findAllBySession(sessionId, req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.executionsService.findAuthorized(id, req.user);
  }

  // Rota de segurança para o médico acessar o vídeo local temporariamente
  @Get(':id/video-url')
  @UseGuards(PhysioGuard)
  getSignedVideoUrl(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.executionsService.getSignedVideoUrl(id, req.user);
  }
}
