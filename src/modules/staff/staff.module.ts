import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Business } from '../businesses/entities/business.entity';
import { Staff } from './entities/staff.entity';

import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Staff,
            Business,
        ]),
    ],
    controllers: [StaffController],
    providers: [StaffService],
    exports: [StaffService],
})
export class StaffModule { }