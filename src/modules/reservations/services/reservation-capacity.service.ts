import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { BusinessOperatingHours } from 'src/modules/availability/entities/business-operating-hours.entity';
import { BlockedTime } from 'src/modules/availability/entities/blocked-time.entity';
import { Reservation } from '../entities/reservation.entity';
import { getUtcDateForBusiness } from '../utils/timezone.util';
import { ReservationStatus } from '../enums/reservation-status.enum';

@Injectable()
export class ReservationCapacityService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,

    @InjectRepository(BusinessOperatingHours)
    private readonly businessHoursRepository: Repository<BusinessOperatingHours>,

    @InjectRepository(BlockedTime)
    private readonly blockedTimeRepository: Repository<BlockedTime>,

    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async validateReservationCapacity(
    businessId: number,
    date: string,
    time: string,
    guestCount: number,
  ): Promise<void> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });

    if (!business) {
      throw new BadRequestException('Business not found');
    }

    const timezone = business.timezone || 'Asia/Jakarta';

    let reservationDateTime: Date;
    try {
      reservationDateTime = getUtcDateForBusiness(date, time, timezone);
    } catch {
      throw new BadRequestException('Invalid reservation date or time format');
    }

    // Step 1: Check blocked dates/times
    const blocked = await this.blockedTimeRepository
      .createQueryBuilder('blocked')
      .where('blocked.businessId = :businessId', { businessId })
      .andWhere(
        ':reservationTime >= blocked.startDateTime AND :reservationTime < blocked.endDateTime',
        {
          reservationTime: reservationDateTime,
        },
      )
      .getOne();

    if (blocked) {
      throw new BadRequestException(
        'Reservation date/time is blocked by business operations',
      );
    }

    // Step 2: Check operating hours
    const dayOfWeek = new Date(date).getUTCDay();
    if (isNaN(dayOfWeek)) {
      throw new BadRequestException('Invalid date format');
    }

    const operatingHour = await this.businessHoursRepository.findOne({
      where: {
        businessId,
        dayOfWeek,
      },
    });

    if (!operatingHour || operatingHour.isClosed) {
      throw new BadRequestException('Business is closed on this day');
    }

    if (
      !operatingHour.startTime ||
      !operatingHour.endTime ||
      time < operatingHour.startTime ||
      time >= operatingHour.endTime
    ) {
      throw new BadRequestException(
        'Reservation time is outside operating hours',
      );
    }

    // Step 3: Check reservation slot exists (align with interval, e.g. 15 mins)
    const slotInterval =
      (business.settings?.slotInterval as number | undefined) ?? 15;
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || minutes % slotInterval !== 0) {
      throw new BadRequestException(
        `Reservation time must align with ${slotInterval}-minute slots`,
      );
    }

    // Step 4: Calculate current occupancy
    const activeStatuses = [
      ReservationStatus.PENDING,
      ReservationStatus.CONFIRMED,
      ReservationStatus.COMPLETED,
    ];

    const sumResult = await this.reservationRepository
      .createQueryBuilder('reservation')
      .select('SUM(reservation.guestCount)', 'sum')
      .where('reservation.businessId = :businessId', { businessId })
      .andWhere('reservation.reservationDate = :date', { date })
      .andWhere('reservation.reservationTime = :time', { time })
      .andWhere('reservation.status IN (:...activeStatuses)', {
        activeStatuses,
      })
      .getRawOne<{ sum: string | null }>();

    const currentOccupancy = parseInt(sumResult?.sum ?? '0', 10);
    const capacity = (business.settings?.capacity as number | undefined) ?? 50;

    if (currentOccupancy + guestCount > capacity) {
      throw new BadRequestException('Business capacity exceeded for this slot');
    }
  }
}
