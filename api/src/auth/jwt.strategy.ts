import { requireTenant } from './current-user.decorator';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PatientsService } from '../patients/patients.service';
import { getJwtSecret } from './jwt-secret';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService, private readonly patientsService: PatientsService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['Authentication'];
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    const tokenVersion = payload.tokenVersion ?? 0;
    if (!Number.isInteger(user.tokenVersion) || tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException();
    }
    if (requireTenant(payload.tenantId) !== user.tenantId) throw new UnauthorizedException();
    const patient = await this.patientsService.findByUserId(user.id, user.tenantId);
    if (payload.role === 'PATIENT' && (!patient || patient.id !== payload.patientId)) throw new UnauthorizedException();
    if (payload.role === 'PHYSIO' && (patient || user.role !== 'PHYSIO')) throw new UnauthorizedException();
    if (!['PATIENT', 'PHYSIO'].includes(payload.role)) throw new UnauthorizedException();
    return {
      tenantId: user.tenantId,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      patientId: payload.patientId,
      name: payload.name,
      tokenVersion: user.tokenVersion,
    };
  }
}
