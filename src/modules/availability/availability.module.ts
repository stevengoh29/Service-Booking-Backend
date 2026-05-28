import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../businesses/entities/business.entity';
import { Staff } from '../staff/entities/staff.entity';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { BlockedTime } from './entities/blocked-time.entity';
import { BusinessOperatingHours } from './entities/business-operating-hours.entity';
import { StaffLeave } from './entities/staff-leave.entity';
import { StaffWorkingHours } from './entities/staff-working-hours.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Business,
            Staff,
            BusinessOperatingHours,
            StaffWorkingHours,
            StaffLeave,
            BlockedTime,
        ]),
    ],
    controllers: [AvailabilityController],
    providers: [AvailabilityService],
    exports: [AvailabilityService],
})
export class AvailabilityModule { }
