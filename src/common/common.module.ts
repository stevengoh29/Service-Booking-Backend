import { Global, Module } from '@nestjs/common';
import { SupabaseProvider } from './providers/supabase.provider';
import { DomainEventEmitter } from './providers/domain-event-emitter.service';

@Global()
@Module({
  providers: [SupabaseProvider, DomainEventEmitter],
  exports: [SupabaseProvider, DomainEventEmitter], // 👈 important
})
export class CommonModule {}
