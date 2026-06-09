import {
  Body,
  Controller,
  Param,
  Post,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Public } from 'src/common/decorators/public.decorator';
import { ResponseUtil } from 'src/common/utils/response-util';
import { ReservationService } from '../services/reservation.service';
import { CreatePublicReservationDto } from '../dto/create-public-reservation.dto';
import { ReservationSource } from '../enums/reservation-source.enum';

@Controller()
export class PublicReservationController {
  constructor(
    private readonly reservationService: ReservationService,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

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
}
