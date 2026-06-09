import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SupabaseAuthGuard } from './modules/users/guards/supabase-auth.guard';
import { UsersModule } from './modules/users/user.module';
import { CommonModule } from './common/common.module';
import configuration from './config/configuration';
import { BusinessesModule } from './modules/businesses/business.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],

  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true, // dev only
        ssl: false,
      }),
    }),

    // Application Modules
    CommonModule,
    UsersModule,
    BusinessesModule,
    AvailabilityModule,
    CustomersModule,
    ReservationsModule,
    UploadsModule,
  ],
})
export class AppModule {}
