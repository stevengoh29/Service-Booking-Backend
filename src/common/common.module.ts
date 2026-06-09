import { Global, Module } from '@nestjs/common';
import {
  SupabaseProvider,
  SupabaseServiceRoleProvider,
} from './providers/supabase.provider';
import { DomainEventEmitter } from './providers/domain-event-emitter.service';

@Global()
@Module({
  providers: [SupabaseProvider, SupabaseServiceRoleProvider, DomainEventEmitter],
  exports: [SupabaseProvider, SupabaseServiceRoleProvider, DomainEventEmitter],
})
export class CommonModule {}
