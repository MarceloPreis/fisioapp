import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, from } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { AuditEvent } from './audit.entity';
import { requireTenant } from '../auth/current-user.decorator';
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@InjectRepository(AuditEvent) private readonly repository: Repository<AuditEvent>) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const resource = request.route?.path || '';
    if (!request.user || (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && !resource.endsWith('/video-url'))) return next.handle();
    const event = { tenantId: requireTenant(request.user.tenantId), userId: request.user.userId, ip: request.ip || 'unknown', resource, resourceId: request.params.id || null };
    // Record intent before any mutation, and completion before returning data.
    return from(this.repository.insert({ ...event, action: `${request.method}:attempt` })).pipe(concatMap(() => next.handle()), concatMap(result => from(this.repository.insert({
      ...event, action: `${request.method}:success`, resourceId: request.params.id || result?.id || null,
    })).pipe(map(() => result))));
  }
}
