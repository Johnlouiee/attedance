import { Controller, Get, Post, Put, Body, HttpCode, HttpStatus, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto } from './dto/auth.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('photo')
  @HttpCode(HttpStatus.OK)
  updatePhoto(@Request() req: any, @Body() body: { photoBase64: string }) {
    return this.authService.updatePhoto(req.user.sub, body.photoBase64);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  sendVerification(@Request() req: any) {
    return this.authService.sendVerificationEmail(req.user.sub);
  }
}
