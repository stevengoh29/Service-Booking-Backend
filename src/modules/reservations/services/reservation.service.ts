import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Reservation } from '../entities/reservation.entity';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { ReservationSource } from '../enums/reservation-source.enum';
import { ReservationCapacityService } from './reservation-capacity.service';
import { CustomersService } from 'src/modules/customers/customers.service';
import { DomainEventEmitter } from 'src/common/providers/domain-event-emitter.service';
import { CreatePublicReservationDto } from '../dto/create-public-reservation.dto';
import { CreateManualReservationDto } from '../dto/create-manual-reservation.dto';
import { normalizePhone } from '../utils/phone.util';

@Injectable()
export class ReservationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly capacityService: ReservationCapacityService,
    private readonly customersService: CustomersService,
    private readonly eventEmitter: DomainEventEmitter,

    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,

    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async createReservation(
    businessId: number,
    dto: CreatePublicReservationDto | CreateManualReservationDto,
    source: ReservationSource,
    user?: User,
  ): Promise<Reservation> {
    // Normalize phone number
    const normalizedPhone = normalizePhone(dto.customerPhone);

    // Validate capacity
    await this.capacityService.validateReservationCapacity(
      businessId,
      dto.date,
      dto.time,
      dto.guestCount,
    );

    // Run creation steps in transaction
    return await this.dataSource.transaction(async (manager) => {
      // Find or create customer record and increment reservation counts
      const customer = await this.customersService.findOrCreateAndTrack(
        businessId,
        { name: dto.customerName, phone: normalizedPhone },
        manager,
      );

      // Generate human-readable reservation number (RSV-YYYYMMDD-XXXX)
      const dateStr = dto.date.replace(/-/g, '');
      const prefix = `RSV-${dateStr}-`;

      const lastReservation = await manager.getRepository(Reservation).findOne({
        where: {
          reservationNumber: Like(`${prefix}%`),
        },
        order: {
          reservationNumber: 'DESC',
        },
        withDeleted: true,
      });

      let nextSequence = 1;
      if (lastReservation) {
        const parts = lastReservation.reservationNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          nextSequence = lastSeq + 1;
        }
      }
      const seqStr = String(nextSequence).padStart(4, '0');
      const reservationNumber = `${prefix}${seqStr}`;

      // Create reservation entity
      const reservation = manager.getRepository(Reservation).create({
        businessId,
        reservationNumber,
        customerId: customer.id,
        customerName: dto.customerName,
        customerPhone: normalizedPhone,
        reservationDate: dto.date,
        reservationTime: dto.time,
        guestCount: dto.guestCount,
        specialRequest: dto.specialRequest ?? null,
        status: ReservationStatus.PENDING,
        source,
        createdById: user?.id ?? null,
        createdByName: user?.name ?? null,
        updatedById: user?.id ?? null,
        updatedByName: user?.name ?? null,
      });

      const saved = await manager.getRepository(Reservation).save(reservation);

      // Emit domain event asynchronously
      this.eventEmitter.emit('reservation.created', { reservation: saved });

      return saved;
    });
  }

  async confirmReservation(uuid: string, user: User): Promise<Reservation> {
    const business = await this.validateUserBusinessOwnership(user);
    const reservation = await this.findReservationByUuidOrFail(uuid);

    if (reservation.businessId !== business.id) {
      throw new ForbiddenException(
        'You do not have permission to manage this reservation',
      );
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Only PENDING reservations can be confirmed',
      );
    }

    reservation.status = ReservationStatus.CONFIRMED;
    reservation.confirmedAt = new Date();
    reservation.updatedById = user.id;
    reservation.updatedByName = user.name;

    const saved = await this.reservationRepository.save(reservation);
    this.eventEmitter.emit('reservation.confirmed', { reservation: saved });
    return saved;
  }

  async cancelReservation(uuid: string, user: User): Promise<Reservation> {
    const business = await this.validateUserBusinessOwnership(user);
    const reservation = await this.findReservationByUuidOrFail(uuid);

    if (reservation.businessId !== business.id) {
      throw new ForbiddenException(
        'You do not have permission to manage this reservation',
      );
    }

    const allowed = [ReservationStatus.PENDING, ReservationStatus.CONFIRMED];
    if (!allowed.includes(reservation.status)) {
      throw new BadRequestException(
        'Only PENDING or CONFIRMED reservations can be cancelled',
      );
    }

    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    reservation.updatedById = user.id;
    reservation.updatedByName = user.name;

    const saved = await this.reservationRepository.save(reservation);
    this.eventEmitter.emit('reservation.cancelled', { reservation: saved });
    return saved;
  }

  async completeReservation(uuid: string, user: User): Promise<Reservation> {
    const business = await this.validateUserBusinessOwnership(user);
    const reservation = await this.findReservationByUuidOrFail(uuid);

    if (reservation.businessId !== business.id) {
      throw new ForbiddenException(
        'You do not have permission to manage this reservation',
      );
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only CONFIRMED reservations can be completed',
      );
    }

    reservation.status = ReservationStatus.COMPLETED;
    reservation.completedAt = new Date();
    reservation.updatedById = user.id;
    reservation.updatedByName = user.name;

    const saved = await this.reservationRepository.save(reservation);
    this.eventEmitter.emit('reservation.completed', { reservation: saved });
    return saved;
  }

  async noShowReservation(uuid: string, user: User): Promise<Reservation> {
    const business = await this.validateUserBusinessOwnership(user);
    const reservation = await this.findReservationByUuidOrFail(uuid);

    if (reservation.businessId !== business.id) {
      throw new ForbiddenException(
        'You do not have permission to manage this reservation',
      );
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only CONFIRMED reservations can be marked as no show',
      );
    }

    reservation.status = ReservationStatus.NO_SHOW;
    reservation.noShowAt = new Date();
    reservation.updatedById = user.id;
    reservation.updatedByName = user.name;

    const saved = await this.reservationRepository.save(reservation);
    this.eventEmitter.emit('reservation.no_show', { reservation: saved });
    return saved;
  }

  private async findReservationByUuidOrFail(
    uuid: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { uuid },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    return reservation;
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
