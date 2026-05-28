import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query
} from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateStaffDto } from "./dto/create-staff.dto";
import { QueryStaffDto } from "./dto/query-staff.dto";
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
        @CurrentUser() user: User,
    ) {
        return this.staffService.create(
            businessUuid,
            dto,
            user,
        );
    }

    @Get()
    findAll(
        @Param('businessUuid') businessUuid: string,
        @Query() query: QueryStaffDto,
        @CurrentUser() user: User,
    ) {
        return this.staffService.findAll(
            businessUuid,
            query,
            user,
        );
    }

    @Get(':staffUuid')
    findOne(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @CurrentUser() user: User,
    ) {
        return this.staffService.findOne(
            businessUuid,
            staffUuid,
            user,
        );
    }

    @Patch(':staffUuid')
    update(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Body() dto: UpdateStaffDto,
        @CurrentUser() user: User,
    ) {
        return this.staffService.update(
            businessUuid,
            staffUuid,
            dto,
            user,
        );
    }

    @Patch(':staffUuid/status')
    updateStatus(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @Body() dto: UpdateStaffStatusDto,
        @CurrentUser() user: User,
    ) {
        return this.staffService.updateStatus(
            businessUuid,
            staffUuid,
            dto,
            user,
        );
    }

    @Patch(':staffUuid/deactivate')
    deactivate(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @CurrentUser() user: User,
    ) {
        return this.staffService.deactivate(
            businessUuid,
            staffUuid,
            user,
        );
    }

    @Patch(':staffUuid/activate')
    activate(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @CurrentUser() user: User,
    ) {
        return this.staffService.activate(
            businessUuid,
            staffUuid,
            user,
        );
    }

    @Delete(':staffUuid')
    remove(
        @Param('businessUuid') businessUuid: string,
        @Param('staffUuid') staffUuid: string,
        @CurrentUser() user: User,
    ) {
        return this.staffService.remove(
            businessUuid,
            staffUuid,
            user,
        );
    }
}
