import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/modules/users/entities/user.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { ResponseUtil } from 'src/common/utils/response-util';
import { ReservationService } from '../services/reservation.service';
import { ReservationQueryService } from '../services/reservation-query.service';
import { CreateManualReservationDto } from '../dto/create-manual-reservation.dto';
import { ReservationFilterDto } from '../dto/reservation-filter.dto';
import { ReservationSource } from '../enums/reservation-source.enum';

@Controller('reservations')
export class ReservationController {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly queryService: ReservationQueryService,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) { }

  @Post('manual')
  async createManualReservation(
    @CurrentUser() user: User,
    @Body() dto: CreateManualReservationDto,
  ) {
    const business = await this.validateUserBusinessOwnership(user);

    const reservation = await this.reservationService.createReservation(
      business.id,
      dto,
      ReservationSource.MANUAL,
      user,
    );
    return ResponseUtil.success(
      reservation,
      'Manual reservation created successfully',
    );
  }

  @Patch(':uuid/confirm')
  async confirmReservation(
    @CurrentUser() user: User,
    @Param('uuid') uuid: string,
  ) {
    const reservation = await this.reservationService.confirmReservation(
      uuid,
      user,
    );
    return ResponseUtil.success(
      reservation,
      'Reservation confirmed successfully',
    );
  }

  @Patch(':uuid/cancel')
  async cancelReservation(
    @CurrentUser() user: User,
    @Param('uuid') uuid: string,
  ) {
    const reservation = await this.reservationService.cancelReservation(
      uuid,
      user,
    );
    return ResponseUtil.success(
      reservation,
      'Reservation cancelled successfully',
    );
  }

  @Patch(':uuid/complete')
  async completeReservation(
    @CurrentUser() user: User,
    @Param('uuid') uuid: string,
  ) {
    const reservation = await this.reservationService.completeReservation(
      uuid,
      user,
    );
    return ResponseUtil.success(
      reservation,
      'Reservation completed successfully',
    );
  }

  @Patch(':uuid/no-show')
  async noShowReservation(
    @CurrentUser() user: User,
    @Param('uuid') uuid: string,
  ) {
    const reservation = await this.reservationService.noShowReservation(
      uuid,
      user,
    );
    return ResponseUtil.success(
      reservation,
      'Reservation marked as no show successfully',
    );
  }

  @Get('today')
  async getTodayReservations(@CurrentUser() user: User) {
    const business = await this.validateUserBusinessOwnership(user);
    const stats = await this.queryService.getTodayReservations(
      business.id,
      business.timezone || 'Asia/Jakarta',
    );
    return ResponseUtil.success(
      stats,
      "Today's reservations fetched successfully",
    );
  }

  @Get('upcoming')
  async getUpcomingReservations(@CurrentUser() user: User) {
    const business = await this.validateUserBusinessOwnership(user);
    const reservations = await this.queryService.getUpcomingReservations(
      business.id,
      business.timezone || 'Asia/Jakarta',
    );
    return ResponseUtil.success(
      reservations,
      'Upcoming reservations fetched successfully',
    );
  }

  @Get()
  async getReservationList(
    @CurrentUser() user: User,
    @Query() filters: ReservationFilterDto,
  ) {
    const business = await this.validateUserBusinessOwnership(user);
    const result = await this.queryService.getReservationList(
      business.id,
      filters,
    );
    return ResponseUtil.successPagination(
      result.items,
      result.meta,
      'Reservations fetched successfully',
    );
  }

  @Get('calendar')
  async getCalendarView(@CurrentUser() user: User) {
    const business = await this.validateUserBusinessOwnership(user);
    const calendar = await this.queryService.getCalendarView(business.id);
    return ResponseUtil.success(
      calendar,
      'Calendar reservations fetched successfully',
    );
  }

  private async validateUserBusinessOwnership(user: User): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { ownerUserId: user.id },
    });
    if (!business) {
      throw new ForbiddenException('User does not own a business');
    }
    return business;
  }
}
