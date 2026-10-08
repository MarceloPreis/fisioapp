import { LoginRateGuard } from './login-rate.guard';
import { LoginDto } from './login.dto';
import { Controller, Request, Post, UseGuards, Get, Res, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PatientGuard } from './patient.guard';
import { ChangePasswordDto } from './change-password.dto';
import { CurrentUser, type AuthenticatedUser } from './current-user.decorator';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(LoginRateGuard)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    
    const { access_token, user: userData } = await this.authService.login(user);
    
    response.cookie('Authentication', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    return { message: 'Login realizado com sucesso', user: userData };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, PatientGuard)
  async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token } = await this.authService.changePatientPassword(
      user,
      body.currentPassword,
      body.newPassword,
    );
    response.cookie('Authentication', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return { message: 'Senha alterada com sucesso.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.cookie('Authentication', '', {
      httpOnly: true,
      expires: new Date(0),
    });
    return { message: 'Logout realizado' };
  }
}
