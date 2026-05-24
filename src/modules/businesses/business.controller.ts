import {
    Body,
    Controller,
    Get,
    Patch,
    Post
} from '@nestjs/common';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ResponseUtil } from 'src/common/utils/response-util';
import { BusinessesService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('businesses')
// @UseGuards(SupabaseAuthGuard)
export class BusinessesController {
    constructor(
        private readonly businessesService: BusinessesService,
    ) { }

    @Post()
    async createBusiness(
        @CurrentUser() user: any,
        @Body() dto: CreateBusinessDto,
    ) {
        const business = await this.businessesService.createBusiness(
            user.id,
            dto,
        );

        return ResponseUtil.success(
            business,
            'Business created successfully',
        );
    }

    @Get('me')
    async getMyBusiness(@CurrentUser() user: any) {
        const business = await this.businessesService.getMyBusiness(
            user.id,
        );

        return ResponseUtil.success(
            business,
            'Business fetched successfully',
        );
    }

    @Patch('me')
    async updateMyBusiness(
        @CurrentUser() user: any,
        @Body() dto: UpdateBusinessDto,
    ) {
        const business = await this.businessesService.updateMyBusiness(
            user.id,
            dto,
        );

        return ResponseUtil.success(
            business,
            'Business updated successfully',
        );
    }
}