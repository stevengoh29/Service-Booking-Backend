/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DomainEventEmitter } from 'src/common/providers/domain-event-emitter.service';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { CustomersService } from 'src/modules/customers/customers.service';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { ReservationSource } from '../enums/reservation-source.enum';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { ReservationCapacityService } from './reservation-capacity.service';
import { ReservationService } from './reservation.service';

describe('ReservationService', () => {
  let service: ReservationService;
  let capacityService: ReservationCapacityService;
  let customersService: CustomersService;
  let eventEmitter: DomainEventEmitter;
  let reservationRepo: Repository<Reservation>;
  let businessRepo: Repository<Business>;

  const mockEntityManager = {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => ({ id: 1, ...x })),
    }),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ReservationCapacityService,
          useValue: {
            validateReservationCapacity: jest.fn(),
          },
        },
        {
          provide: CustomersService,
          useValue: {
            findOrCreateAndTrack: jest.fn(),
          },
        },
        {
          provide: DomainEventEmitter,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn((x) => x),
          },
        },
        {
          provide: getRepositoryToken(Business),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    capacityService = module.get<ReservationCapacityService>(
      ReservationCapacityService,
    );
    customersService = module.get<CustomersService>(CustomersService);
    eventEmitter = module.get<DomainEventEmitter>(DomainEventEmitter);
    reservationRepo = module.get<Repository<Reservation>>(
      getRepositoryToken(Reservation),
    );
    businessRepo = module.get<Repository<Business>>(
      getRepositoryToken(Business),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReservation', () => {
    it('should successfully create a reservation and emit event', async () => {
      const dto = {
        date: '2026-06-20',
        time: '18:00',
        guestCount: 4,
        customerName: 'Steven',
        customerPhone: '+62 812 3456 789',
        specialRequest: 'Window seat',
      };

      jest
        .spyOn(capacityService, 'validateReservationCapacity')
        .mockResolvedValue(undefined);
      jest
        .spyOn(customersService, 'findOrCreateAndTrack')
        .mockResolvedValue({ id: 5 } as Customer);

      const repoMock = mockEntityManager.getRepository(Reservation);
      jest.spyOn(repoMock, 'findOne').mockResolvedValue(null); // No previous reservations on this day

      const reservation = await service.createReservation(
        1,
        dto,
        ReservationSource.PUBLIC,
      );

      expect(capacityService.validateReservationCapacity).toHaveBeenCalledWith(
        1,
        '2026-06-20',
        '18:00',
        4,
      );
      expect(customersService.findOrCreateAndTrack).toHaveBeenCalledWith(
        1,
        { name: 'Steven', phone: '628123456789' },
        mockEntityManager,
      );
      expect(repoMock.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'reservation.created',
        expect.any(Object),
      );
      expect(reservation.reservationNumber).toBe('RSV-20260620-0001');
      expect(reservation.customerPhone).toBe('628123456789');
    });

    it('should increment reservation number sequence on same day', async () => {
      const dto = {
        date: '2026-06-20',
        time: '19:00',
        guestCount: 2,
        customerName: 'Alice',
        customerPhone: '0812-3456-7890',
      };

      jest
        .spyOn(capacityService, 'validateReservationCapacity')
        .mockResolvedValue(undefined);
      jest
        .spyOn(customersService, 'findOrCreateAndTrack')
        .mockResolvedValue({ id: 5 } as Customer);

      const repoMock = mockEntityManager.getRepository(Reservation);
      jest.spyOn(repoMock, 'findOne').mockResolvedValue({
        reservationNumber: 'RSV-20260620-0005',
      });

      const reservation = await service.createReservation(
        1,
        dto,
        ReservationSource.MANUAL,
      );

      expect(reservation.reservationNumber).toBe('RSV-20260620-0006');
    });
  });

  describe('confirmReservation', () => {
    const user = { id: 10, name: 'Owner' } as User;

    it('should throw ForbiddenException if user does not own a business', async () => {
      jest.spyOn(businessRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.confirmReservation('uuid-123', user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if reservation belongs to different business', async () => {
      jest
        .spyOn(businessRepo, 'findOne')
        .mockResolvedValue({ id: 1, ownerUserId: 10 } as Business);
      jest.spyOn(reservationRepo, 'findOne').mockResolvedValue({
        id: 100,
        businessId: 2,
        status: ReservationStatus.PENDING,
      } as Reservation);

      await expect(
        service.confirmReservation('uuid-123', user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if status is not PENDING', async () => {
      jest
        .spyOn(businessRepo, 'findOne')
        .mockResolvedValue({ id: 1, ownerUserId: 10 } as Business);
      jest.spyOn(reservationRepo, 'findOne').mockResolvedValue({
        id: 100,
        businessId: 1,
        status: ReservationStatus.CONFIRMED,
      } as Reservation);

      await expect(
        service.confirmReservation('uuid-123', user),
      ).rejects.toThrow(BadRequestException);
    });

    it('should confirm reservation successfully and emit event', async () => {
      jest
        .spyOn(businessRepo, 'findOne')
        .mockResolvedValue({ id: 1, ownerUserId: 10 } as Business);
      const reservation = {
        id: 100,
        businessId: 1,
        status: ReservationStatus.PENDING,
        uuid: 'uuid-123',
      } as Reservation;
      jest.spyOn(reservationRepo, 'findOne').mockResolvedValue(reservation);

      const result = await service.confirmReservation('uuid-123', user);

      expect(result.status).toBe(ReservationStatus.CONFIRMED);
      expect(result.confirmedAt).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('reservation.confirmed', {
        reservation: result,
      });
    });
  });
});
