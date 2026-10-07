import { LoginRateGuard } from './login-rate.guard';
import { LoginDto } from './login.dto';
import { Controller, Request, Post, UseGuards, Get, Res, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
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
