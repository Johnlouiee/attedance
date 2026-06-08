import { Controller, Post, Put, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
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
}
