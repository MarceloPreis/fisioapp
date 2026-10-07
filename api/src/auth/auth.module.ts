import { getJwtSecret } from './jwt-secret';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PatientsModule } from '../patients/patients.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PatientsModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
