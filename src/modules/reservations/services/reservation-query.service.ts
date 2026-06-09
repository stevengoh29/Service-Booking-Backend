import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { ReservationFilterDto } from '../dto/reservation-filter.dto';
import { getBusinessLocalDateString } from '../utils/timezone.util';
import { ReservationStatus } from '../enums/reservation-status.enum';

@Injectable()
export class ReservationQueryService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) { }

  async getTodayReservations(businessId: number, timezone: string) {
    const todayStr = getBusinessLocalDateString(timezone);

    const reservations = await this.reservationRepository.find({
      where: {
        businessId,
        reservationDate: todayStr,
      },
    });

    const totalBookings = reservations.length;
    const totalGuests = reservations.reduce(
      (sum, res) => sum + res.guestCount,
      0,
    );
    const confirmedCount = reservations.filter(
      (res) => res.status === ReservationStatus.CONFIRMED,
    ).length;
    const pendingCount = reservations.filter(
      (res) => res.status === ReservationStatus.PENDING,
    ).length;

    return {
      totalBookings,
      totalGuests,
      confirmedCount,
      pendingCount,
    };
  }

  async getUpcomingReservations(businessId: number, timezone: string) {
    const todayStr = getBusinessLocalDateString(timezone);

    // Next 7 days
    const todayDate = new Date(todayStr);
    const end = new Date(todayDate);
    end.setDate(todayDate.getDate() + 7);
    const endStr = end.toISOString().split('T')[0];

    return await this.reservationRepository.find({
      where: {
        businessId,
        reservationDate: Between(todayStr, endStr),
      },
      order: {
        reservationDate: 'ASC',
        reservationTime: 'ASC',
      },
    });
  }

  async getReservationList(businessId: number, filters: ReservationFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.businessId = :businessId', { businessId });

    if (filters.date) {
      queryBuilder.andWhere('reservation.reservationDate = :date', {
        date: filters.date,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('reservation.status = :status', {
        status: filters.status,
      });
    }

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      queryBuilder.andWhere(
        '(reservation.reservationNumber LIKE :searchPattern OR reservation.customerName LIKE :searchPattern OR reservation.customerPhone LIKE :searchPattern)',
        { searchPattern },
      );
    }

    queryBuilder
      .orderBy('reservation.reservationDate', 'DESC')
      .addOrderBy('reservation.reservationTime', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCalendarView(businessId: number) {
    const reservations = await this.reservationRepository.find({
      where: { businessId },
      order: {
        reservationDate: 'ASC',
        reservationTime: 'ASC',
      },
    });

    const grouped: Record<string, Reservation[]> = {};
    for (const res of reservations) {
      if (!grouped[res.reservationDate]) {
        grouped[res.reservationDate] = [];
      }
      grouped[res.reservationDate].push(res);
    }

    return grouped;
  }
}
