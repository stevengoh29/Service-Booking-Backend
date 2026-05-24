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

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private userService: UserService,
        @Inject(SUPABASE_CLIENT)
        private supabase: SupabaseClient,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (isPublic) return true;

        const req = context.switchToHttp().getRequest();

        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            throw new UnauthorizedException({
                reasonCode: 'NO_TOKEN',
                message: 'Missing token',
            });
        }

        const { data, error } = await this.supabase.auth.getUser(token);

        if (error || !data.user) {
            throw new UnauthorizedException({
                reasonCode: 'INVALID_TOKEN',
                message: 'Invalid token',
            });
        }

        // 🔥 Sync with your DB
        const user = await this.userService.findOrCreateFromSupabase(
            data.user,
        );

        req.user = user;

        return true;
    }
}