import { Global, Module } from '@nestjs/common';
import { SupabaseProvider } from './providers/supabase.provider';


@Global()
@Module({
    providers: [SupabaseProvider],
    exports: [SupabaseProvider], // 👈 important
})
export class CommonModule { }