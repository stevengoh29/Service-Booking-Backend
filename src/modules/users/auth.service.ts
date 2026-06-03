import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/common/providers/supabase.provider';
import { UserService } from './user.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
    private readonly userService: UserService,
  ) {}

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException({
        reasonCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const user = await this.userService.findOrCreateFromSupabase(data.user);

    return {
      session: data.session,
      user,
    };
  }
}
