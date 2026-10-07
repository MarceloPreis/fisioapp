import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class PhysioGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.switchToHttp().getRequest().user?.role !== 'PHYSIO') {
      throw new ForbiddenException('Acesso exclusivo do fisioterapeuta.');
    }
    return true;
  }
}
