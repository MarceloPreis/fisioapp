import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
@Injectable()
export class LoginRateGuard implements CanActivate {
  private attempts = new Map<string, { count: number; expires: number }>();
  canActivate(context: ExecutionContext): boolean {
    const now = Date.now();
    for (const [key, value] of this.attempts) if (value.expires <= now) this.attempts.delete(key);
    const key = context.switchToHttp().getRequest().ip;
    const value = this.attempts.get(key) || { count: 0, expires: now + 15 * 60 * 1000 };
    if (value.count >= 20 || this.attempts.size >= 10000) throw new HttpException('Muitas tentativas de login. Tente mais tarde.', 429);
    value.count++;
    this.attempts.set(key, value);
    return true;
  }
}
