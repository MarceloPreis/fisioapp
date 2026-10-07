import { Controller, Post, Get, Param, Body, Request, UploadedFile, UseInterceptors, UseGuards, BadRequestException, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideosService } from './videos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InitUploadDto, ChunkDto, CompleteUploadDto } from './dto/upload.dto';
@UseGuards(JwtAuthGuard)
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}
  @Post('upload/init')
  initUpload(@Body() body: InitUploadDto, @Request() req: any) { return this.videosService.initUpload(req.user.userId, body.totalChunks, req.user.tenantId); }
  @Post('upload/chunk')
  @UseInterceptors(FileInterceptor('chunk', { limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 2 } }))
  async uploadChunk(@Body() body: ChunkDto, @UploadedFile() chunk: Express.Multer.File, @Request() req: any) {
    if (!chunk) throw new BadRequestException('Chunk obrigatério.');
    await this.videosService.saveChunk(body.uploadId, body.chunkIndex, chunk.buffer, req.user.userId, req.user.tenantId);
    return { success: true };
  }
  @Post('upload/complete') @HttpCode(202)
  completeUpload(@Body() body: CompleteUploadDto, @Request() req: any) { return this.videosService.completeUpload(body.uploadId, body.fileName, req.user.userId, req.user.tenantId); }
  @Get('upload/:id')
  status(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) { return this.videosService.status(id, req.user.userId, req.user.tenantId); }
}
