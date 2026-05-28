import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/modules/users/entities/user.entity';
import { AvailabilityService } from './availability.service';
import { CreateBlockedTimeDto } from './dto/create-blocked-time.dto';
import { CreateStaffLeaveDto } from './dto/create-staff-leave.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { UpdateBlockedTimeDto } from './dto/update-blocked-time.dto';
import { UpdateBusinessOperatingHoursDto } from './dto/update-business-operating-hours.dto';
import { UpdateStaffLeaveDto } from './dto/update-staff-leave.dto';
import { UpdateStaffWorkingHoursDto } from './dto/update-staff-working-hours.dto';

@Controller()
export class AvailabilityController {
    constructor(private readonly availabilityService: AvailabilityService) { }

    @Get('businesses/:businessUuid/availability/business-hours')
    getBusinessHours(
        @Param('businessUuid') businessUuid: string,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.getBusinessHours(businessUuid, user);
    }

    @Patch('businesses/:businessUuid/availability/business-hours')
    updateBusinessHours(
        @Param('businessUuid') businessUuid: string,
        @Body() dto: UpdateBusinessOperatingHoursDto,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.updateBusinessHours(
            businessUuid,
            dto,
            user,
        );
    }

    @Get('businesses/:businessUuid/staff/:staffUuid/availability')
    getStaffWorkingHours(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.getStaffWorkingHours(
            businessUuid,
            staffUuid,
            user,
        );
    }

    @Patch('businesses/:businessUuid/staff/:staffUuid/availability')
    updateStaffWorkingHours(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Body() dto: UpdateStaffWorkingHoursDto,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.updateStaffWorkingHours(
            businessUuid,
            staffUuid,
            dto,
            user,
        );
    }

    @Post('businesses/:businessUuid/staff/:staffUuid/leave')
    createStaffLeave(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Body() dto: CreateStaffLeaveDto,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.createStaffLeave(
            businessUuid,
            staffUuid,
            dto,
            user,
        );
    }

    @Get('businesses/:businessUuid/staff/:staffUuid/leave')
    getStaffLeaves(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Query() query: QueryAvailabilityDto,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.getStaffLeaves(
            businessUuid,
            staffUuid,
            query,
            user,
        );
    }

    @Patch('businesses/:businessUuid/staff/:staffUuid/leave/:leaveUuid')
    updateStaffLeave(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Param('leaveUuid') leaveUuid: string,
        @Body() dto: UpdateStaffLeaveDto,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.updateStaffLeave(
            businessUuid,
            staffUuid,
            leaveUuid,
            dto,
            user,
        );
    }

    @Delete('businesses/:businessUuid/staff/:staffUuid/leave/:leaveUuid')
    deleteStaffLeave(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Param('leaveUuid') leaveUuid: string,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.deleteStaffLeave(
            businessUuid,
            staffUuid,
            leaveUuid,
            user,
        );
    }

    @Post('businesses/:businessUuid/blocked-times')
    createBlockedTime(
        @Param('businessUuid') businessUuid: string,
        @Body() dto: CreateBlockedTimeDto,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.createBlockedTime(businessUuid, dto, user);
    }

    @Get('businesses/:businessUuid/blocked-times')
    getBlockedTimes(
        @Param('businessUuid') businessUuid: string,
        @Query() query: QueryAvailabilityDto,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.getBlockedTimes(businessUuid, query, user);
    }

    @Patch('businesses/:businessUuid/blocked-times/:blockedTimeUuid')
    updateBlockedTime(
        @Param('businessUuid') businessUuid: string,
        @Param('blockedTimeUuid') blockedTimeUuid: string,
        @Body() dto: UpdateBlockedTimeDto,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.updateBlockedTime(
            businessUuid,
            blockedTimeUuid,
            dto,
            user,
        );
    }

    @Delete('businesses/:businessUuid/blocked-times/:blockedTimeUuid')
    deleteBlockedTime(
        @Param('businessUuid') businessUuid: string,
        @Param('blockedTimeUuid') blockedTimeUuid: string,
        @CurrentUser() user: User,
    ) {
        return this.availabilityService.deleteBlockedTime(
            businessUuid,
            blockedTimeUuid,
            user,
        );
    }
}
