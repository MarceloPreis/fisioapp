import { requireTenant } from '../auth/current-user.decorator';
import { SessionsService } from '../sessions/sessions.service';
import { VideosService } from '../videos/videos.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionExecution } from './execution.entity';
import { ExecutionNote } from './execution-note.entity';
import { CreateExecutionDto } from './dto/execution.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectRepository(SessionExecution)
    private executionsRepository: Repository<SessionExecution>,
    @InjectRepository(ExecutionNote)
    private notesRepository: Repository<ExecutionNote>,
    private sessionsService: SessionsService,
    private videosService: VideosService,
    private storageService: StorageService,
  ) {}

  async create(createExecutionDto: CreateExecutionDto, user: any): Promise<SessionExecution> {
    await this.sessionsService.findAuthorized(createExecutionDto.sessionId, user);
    if (createExecutionDto.videoObjectName) await this.videosService.assertObjectOwner(createExecutionDto.videoObjectName, user.userId, user.tenantId);
    const execution = this.executionsRepository.create({
      tenantId: requireTenant(user.tenantId),
      sessionId: createExecutionDto.sessionId,
      videoObjectName: createExecutionDto.videoObjectName,
    });
    const savedExecution = await this.executionsRepository.manager.transaction(async manager => {
      const saved = await manager.save(SessionExecution, execution);
      if (createExecutionDto.notes?.length) await manager.save(ExecutionNote, createExecutionDto.notes.map(note => manager.create(ExecutionNote, { ...note, executionId: saved.id })));
      return saved;
    });

    return this.findOne(savedExecution.id, user.tenantId);
  }

  async findAllBySession(sessionId: string, user: any): Promise<SessionExecution[]> {
    await this.sessionsService.findAuthorized(sessionId, user);
    return this.executionsRepository.find({ where: { sessionId, tenantId: requireTenant(user.tenantId) }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<SessionExecution> {
    const execution = await this.executionsRepository.findOne({ where: { id, tenantId: requireTenant(tenantId) } });
    if (!execution) throw new NotFoundException('Execução não encontrada');
    return execution;
  }

  async findAuthorized(id: string, user: any): Promise<SessionExecution> {
    const execution = await this.findOne(id, user.tenantId);
    await this.sessionsService.findAuthorized(execution.sessionId, user);
    return execution;
  }

  // Gera a URL assinada (Presigned URL) para visualização segura no front-end
  async getSignedVideoUrl(id: string, user: any): Promise<{ url: string | null }> {
    const execution = await this.findAuthorized(id, user);
    if (!execution.videoObjectName) return { url: null };
    const url = await this.storageService.generatePresignedUrl(execution.videoObjectName);
    return { url };
  }
}
