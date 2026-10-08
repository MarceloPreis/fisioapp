import { requireTenant } from './current-user.decorator';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PatientsService } from '../patients/patients.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private patientsService: PatientsService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      
      const patient = await this.patientsService.findByUserId(user.id, requireTenant(user.tenantId));
      if (patient) {
        return { ...result, role: 'PATIENT', patientId: patient.id };
      }
      if (user.role !== 'PHYSIO') return null;
      return { ...result, role: 'PHYSIO' };
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      tenantId: requireTenant(user.tenantId),
      email: user.email,
      sub: user.id,
      role: user.role,
      patientId: user.patientId,
      name: user.name,
      tokenVersion: user.tokenVersion,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async changePatientPassword(
    authenticatedUser: import('./current-user.decorator').AuthenticatedUser,
    currentPassword: string,
    newPassword: string,
  ) {
    if (authenticatedUser.role !== 'PATIENT' || !authenticatedUser.patientId) {
      throw new UnauthorizedException();
    }

    const tenantId = requireTenant(authenticatedUser.tenantId);
    const patient = await this.patientsService.findByUserId(authenticatedUser.userId, tenantId);
    if (!patient || patient.id !== authenticatedUser.patientId) {
      throw new UnauthorizedException();
    }

    const updatedUser = await this.usersService.changePatientPassword(
      authenticatedUser.userId,
      tenantId,
      patient.id,
      currentPassword,
      newPassword,
    );

    return {
      access_token: this.jwtService.sign({
        tenantId,
        email: authenticatedUser.email,
        sub: authenticatedUser.userId,
        role: 'PATIENT',
        patientId: patient.id,
        name: authenticatedUser.name,
        tokenVersion: updatedUser.tokenVersion,
      }),
    };
  }
}
