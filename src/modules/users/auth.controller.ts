import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from 'src/common/decorators/public.decorator';
import { ResponseUtil } from 'src/common/utils/response-util';
import { clearAuthCookies, setAuthCookies } from './utils/auth-cookie.util';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { session, user } = await this.authService.login(
      body.email,
      body.password,
    );

    setAuthCookies(response, session);

    return ResponseUtil.success(user, 'Logged in successfully');
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    clearAuthCookies(response);
    return ResponseUtil.success(null, 'Logged out successfully');
  }
}
