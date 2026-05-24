import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req
} from '@nestjs/common';
import { CreateStaffDto } from "./dto/create-staff.dto";
import { QueryStaffDto } from "./dto/query-staff.dto";
import { UpdateStaffScheduleDto } from "./dto/update-staff-schedule.dto";
import { UpdateStaffStatusDto } from "./dto/update-staff-status.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";
import { StaffService } from "./staff.service";

@Controller('businesses/:businessUuid/staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Post()
    create(
        @Param('businessUuid') businessUuid: string,
        @Body() dto: CreateStaffDto,
        @Req() req,
    ) {
        return this.staffService.create(
            businessUuid,
            dto,
            req.user,
        );
    }

    @Get()
    findAll(
        @Param('businessUuid') businessUuid: string,
        @Query() query: QueryStaffDto,
    ) {
        return this.staffService.findAll(
            businessUuid,
            query,
        );
    }

    @Get(':staffUuid')
    findOne(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
    ) {
        return this.staffService.findOne(
            businessUuid,
            staffUuid,
        );
    }

    @Patch(':staffUuid')
    update(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Body() dto: UpdateStaffDto,
        @Req() req,
    ) {
        return this.staffService.update(
            businessUuid,
            staffUuid,
            dto,
            req.user,
        );
    }

    @Patch(':staffUuid/schedule')
    updateSchedule(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Body() dto: UpdateStaffScheduleDto,
        @Req() req,
    ) {
        return this.staffService.updateSchedule(
            businessUuid,
            staffUuid,
            dto,
            req.user,
        );
    }

    @Patch(':staffUuid/status')
    updateStatus(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Body() dto: UpdateStaffStatusDto,
        @Req() req,
    ) {
        return this.staffService.updateStatus(
            businessUuid,
            staffUuid,
            dto,
            req.user,
        );
    }

    @Delete(':staffUuid')
    remove(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Req() req,
    ) {
        return this.staffService.remove(
            businessUuid,
            staffUuid,
            req.user,
        );
    }
}