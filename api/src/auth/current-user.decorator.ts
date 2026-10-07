import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: 'PATIENT' | 'PHYSIO';
  patientId?: string;
  name: string;
  email: string;
}

export function requireTenant(tenantId: string): string {
  if (!tenantId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) throw new UnauthorizedException('Contexto de clínica inválido.');
  return tenantId;
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const user = context.switchToHttp().getRequest().user;
  requireTenant(user?.tenantId);
  return user;
});
