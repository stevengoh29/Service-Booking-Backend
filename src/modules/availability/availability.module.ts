import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/entities/business.entity';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { BlockedTime } from './entities/blocked-time.entity';
import { BusinessOperatingHours } from './entities/business-operating-hours.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Business,
            BusinessOperatingHours,
            BlockedTime,
        ]),
    ],
    controllers: [AvailabilityController],
    providers: [AvailabilityService],
    exports: [AvailabilityService],
})
export class AvailabilityModule { }
