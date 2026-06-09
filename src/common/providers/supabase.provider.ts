import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';
export const SUPABASE_SERVICE_ROLE_CLIENT = 'SUPABASE_SERVICE_ROLE_CLIENT';

export const SupabaseProvider = {
  provide: SUPABASE_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): SupabaseClient => {
    const url = configService.get<string>('supabase.url');
    const key = configService.get<string>('supabase.anonKey');
    return createClient(url!, key!);
  },
};

export const SupabaseServiceRoleProvider = {
  provide: SUPABASE_SERVICE_ROLE_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): SupabaseClient => {
    const url = configService.get<string>('supabase.url');
    const key = configService.get<string>('supabase.serviceRoleKey');

    return createClient(url!, key!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  },
};
