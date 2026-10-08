import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class PatientGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.switchToHttp().getRequest().user?.role !== 'PATIENT') {
      throw new ForbiddenException('Acesso exclusivo do paciente.');
    }
    return true;
  }
}
