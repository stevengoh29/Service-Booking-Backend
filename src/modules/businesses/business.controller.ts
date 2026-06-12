import { Body, Controller, Get, Patch, Post, Param } from '@nestjs/common';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ResponseUtil } from 'src/common/utils/response-util';
import { BusinessesService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';

@Controller('businesses')
// @UseGuards(SupabaseAuthGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  async createBusiness(
    @CurrentUser() user: any,
    @Body() dto: CreateBusinessDto,
  ) {
    const business = await this.businessesService.createBusiness(user.id, dto);

    return ResponseUtil.success(business, 'Business created successfully');
  }

  @Get('me')
  async getMyBusiness(@CurrentUser() user: any) {
    const business = await this.businessesService.getMyBusiness(user.id);

    return ResponseUtil.success(business, 'Business fetched successfully');
  }

  @Get(':businessUuid/settings')
  async getBusinessSettings(@Param('businessUuid') businessUuid: string) {
    const settings = await this.businessesService.getSettingsByUuid(businessUuid);

    return ResponseUtil.success(settings, 'Business settings fetched successfully');
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

    return ResponseUtil.success(business, 'Business updated successfully');
  }

  @Patch(':businessUuid/settings')
  async updateBusinessSettings(
    @Param('businessUuid') businessUuid: string,
    @Body() dto: UpdateBusinessSettingsDto,
  ) {
    const business = await this.businessesService.updateSettingsByUuid(
      businessUuid,
      dto.settings,
    );

    return ResponseUtil.success(business, 'Business settings updated successfully');
  }
}
