import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { SUPABASE_CLIENT } from 'src/common/providers/supabase.provider';
import { UserService } from '../user.service';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
} from '../constants/auth-cookie.constants';
import { parseCookieHeader, setAuthCookies } from '../utils/auth-cookie.util';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
    @Inject(SUPABASE_CLIENT)
    private supabase: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    const cookies = parseCookieHeader(req.headers.cookie);

    let token =
      this.getBearerToken(req.headers.authorization) ??
      cookies[AUTH_ACCESS_COOKIE];

    if (!token) {
      throw new UnauthorizedException({
        reasonCode: 'NO_TOKEN',
        message: 'Missing token',
      });
    }

    let { data, error } = await this.supabase.auth.getUser(token);

    if ((error || !data.user) && cookies[AUTH_REFRESH_COOKIE]) {
      const { data: refreshed } = await this.supabase.auth.refreshSession({
        refresh_token: cookies[AUTH_REFRESH_COOKIE],
      });

      if (refreshed.session?.access_token) {
        setAuthCookies(res, refreshed.session);
        token = refreshed.session.access_token;
        ({ data, error } = await this.supabase.auth.getUser(token));
      }
    }

    if (error || !data.user) {
      throw new UnauthorizedException({
        reasonCode: 'INVALID_TOKEN',
        message: 'Invalid token',
      });
    }

    // 🔥 Sync with your DB
    const user = await this.userService.findOrCreateFromSupabase(data.user);

    req.user = user;

    return true;
  }

  private getBearerToken(authorization?: string): string | undefined {
    if (!authorization?.startsWith('Bearer ')) return undefined;
    return authorization.slice('Bearer '.length);
  }
}
