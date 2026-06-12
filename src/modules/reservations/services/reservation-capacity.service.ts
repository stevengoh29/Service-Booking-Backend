import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { BusinessOperatingHours } from 'src/modules/availability/entities/business-operating-hours.entity';
import { BlockedTime } from 'src/modules/availability/entities/blocked-time.entity';
import { Reservation } from '../entities/reservation.entity';
import { getUtcDateForBusiness, getBusinessLocalDateString } from '../utils/timezone.util';
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

  private minutesFromTimeString(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private timeStringFromMinutes(minutes: number) {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private generateSlots(
    openTime: string,
    closeTime: string,
    slotInterval: number,
    diningDuration: number,
  ) {
    const startMin = this.minutesFromTimeString(openTime);
    const endMin = this.minutesFromTimeString(closeTime) - diningDuration;
    const slots: string[] = [];
    if (endMin < startMin) return slots;
    for (let t = startMin; t <= endMin; t += slotInterval) {
      slots.push(this.timeStringFromMinutes(t));
    }
    return slots;
  }

  async getAvailableDates(business: Business) {
    const timezone = business.timezone || 'Asia/Jakarta';
    const maxDays = (business.settings?.maxAdvancedDays as number) ?? 14;
    const slotInterval = (business.settings?.slotIntervalMinutes as number) ?? 15;
    const diningDuration = (business.settings?.diningDurationMinutes as number) ?? 90;
    const minAdvancedHours = (business.settings?.minAdvancedHours as number) ?? 0;

    // fetch all operating hours for business
    const hours = await this.businessHoursRepository.find({
      where: { businessId: business.id },
    });

    const availableDates: string[] = [];

    // start from business-local today
    const todayLocal = getBusinessLocalDateString(timezone);
    const baseDate = new Date(todayLocal);

    for (let i = 0; i <= maxDays; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // determine dayOfWeek in business local time
      const midUtc = getUtcDateForBusiness(dateStr, '12:00', timezone);
      const dayOfWeek = midUtc.getUTCDay();

      const operating = hours.find((h) => h.dayOfWeek === dayOfWeek);
      if (!operating || operating.isClosed) continue;

      const slots = this.generateSlots(
        operating.startTime ?? '00:00',
        operating.endTime ?? '00:00',
        slotInterval,
        diningDuration,
      );

      if (slots.length === 0) continue;

      if (i === 0 && minAdvancedHours > 0) {
        // compute earliest allowed local time string
        const now = new Date(Date.now() + minAdvancedHours * 3600000);
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        }).formatToParts(now);
        const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
        const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
        const earliest = `${hour}:${minute}`;
        const filtered = slots.filter((s) => s >= earliest);
        if (filtered.length > 0) availableDates.push(dateStr);
      } else {
        availableDates.push(dateStr);
      }
    }

    return availableDates;
  }

  async getAvailableTimes(business: Business, date: string, partySize: number) {
    const timezone = business.timezone || 'Asia/Jakarta';
    const slotInterval = (business.settings?.slotIntervalMinutes as number) ?? 15;
    const diningDuration = (business.settings?.diningDurationMinutes as number) ?? 90;
    const minAdvancedHours = (business.settings?.minAdvancedHours as number) ?? 0;

    // find operating hours for the day (business-local)
    const midUtc = getUtcDateForBusiness(date, '12:00', timezone);
    const dayOfWeek = midUtc.getUTCDay();

    const operating = await this.businessHoursRepository.findOne({
      where: { businessId: business.id, dayOfWeek },
    });
    if (!operating || operating.isClosed) return [];

    const slots = this.generateSlots(
      operating.startTime ?? '00:00',
      operating.endTime ?? '00:00',
      slotInterval,
      diningDuration,
    );

    if (slots.length === 0) return [];

    // if date is today, filter by minAdvancedHours
    const todayLocal = getBusinessLocalDateString(timezone);
    let filteredSlots = slots;
    if (date === todayLocal && minAdvancedHours > 0) {
      const now = new Date(Date.now() + minAdvancedHours * 3600000);
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      }).formatToParts(now);
      const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
      const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
      const earliest = `${hour}:${minute}`;
      filteredSlots = slots.filter((s) => s >= earliest);
    }

    // find capacity rule
    const capacityRules = business.capacityRules ?? [];
    const matchingRule = capacityRules.find(
      (r) => partySize >= r.minPartySize && partySize <= r.maxPartySize,
    );
    if (!matchingRule) return [];

    // load active reservations for the date
    const excluded = [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW];
    const activeReservations = await this.reservationRepository.find({
      where: {
        businessId: business.id,
        reservationDate: date,
      },
    });

    const activeFiltered = activeReservations.filter(
      (r) => !excluded.includes(r.status),
    );

    const reservationsMinutes = activeFiltered.map((r) => ({
      start: this.minutesFromTimeString(r.reservationTime),
      end: this.minutesFromTimeString(r.reservationTime) + diningDuration,
    }));

    const available: string[] = [];
    for (const slot of filteredSlots) {
      const slotStart = this.minutesFromTimeString(slot);
      const slotEnd = slotStart + diningDuration;

      let overlapCount = 0;
      for (const res of reservationsMinutes) {
        const overlaps = res.start < slotEnd && res.end > slotStart;
        if (overlaps) overlapCount++;
        if (overlapCount >= matchingRule.maxActiveReservations) break;
      }

      if (overlapCount < matchingRule.maxActiveReservations) {
        available.push(slot);
      }
    }

    return available;
  }
}
