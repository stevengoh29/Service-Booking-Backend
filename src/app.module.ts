import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseAuthGuard } from './modules/users/guards/supabase-auth.guard';
import { UsersModule } from './modules/users/user.module';
import { CommonModule } from './common/common.module';
import configuration from './config/configuration';
import { BusinessesModule } from './modules/businesses/business.module';
import { StaffModule } from './modules/staff/staff.module';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    }
  ],

  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),

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
    StaffModule
  ],
})
export class AppModule { }