import { GoneException, Injectable } from '@nestjs/common';
// External calendar integration is disabled: clinical scheduling stays on-premise.
@Injectable()
export class CalendarService {
  getAuthUrl(): never { throw new GoneException('Use a agenda local.'); }
  async handleCallback(_code: string): Promise<never> { throw new GoneException('Use a agenda local.'); }
  setCredentials(_tokens: unknown): never { throw new GoneException('Use a agenda local.'); }
  async createEvent(_event: unknown): Promise<never> { throw new GoneException('Use a agenda local.'); }
}
