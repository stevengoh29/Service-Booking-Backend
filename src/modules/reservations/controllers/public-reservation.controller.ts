import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Public } from 'src/common/decorators/public.decorator';
import { ResponseUtil } from 'src/common/utils/response-util';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Repository } from 'typeorm';
import { CreatePublicReservationDto } from '../dto/create-public-reservation.dto';
import { ReservationSource } from '../enums/reservation-source.enum';
import { ReservationCapacityService } from '../services/reservation-capacity.service';
import { ReservationService } from '../services/reservation.service';

@Controller()
export class PublicReservationController {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly capacityService: ReservationCapacityService,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) { }

  @Public()
  @Post('public/:slug/reservations')
  async createPublicReservation(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicReservationDto,
  ) {
    const business = await this.businessRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const reservation = await this.reservationService.createReservation(
      business.id,
      dto,
      ReservationSource.PUBLIC,
    );

    return ResponseUtil.success(
      reservation,
      'Reservation created successfully',
    );
  }

  @Public()
  @Get('public/:slug/reservation-available-dates')
  async getAvailableDates(@Param('slug') slug: string) {
    const business = await this.businessRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const dates = await this.capacityService.getAvailableDates(business);
    return ResponseUtil.success(dates, 'Available dates fetched successfully');
  }

  @Public()
  @Get('public/:slug/reservations/available-times')
  async getAvailableTimes(
    @Param('slug') slug: string,
    @Query('date') date: string,
    @Query('partySize') partySizeStr: string,
  ) {
    const business = await this.businessRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const partySize = parseInt(partySizeStr ?? '0', 10);
    if (!date || isNaN(partySize) || partySize <= 0) {
      return ResponseUtil.success([], 'No available times');
    }

    const times = await this.capacityService.getAvailableTimes(
      business,
      date,
      partySize,
    );

    return ResponseUtil.success(times, 'Available times fetched successfully');
  }
}
