import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ReservationCapacityService } from './reservation-capacity.service';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { BusinessOperatingHours } from 'src/modules/availability/entities/business-operating-hours.entity';
import { BlockedTime } from 'src/modules/availability/entities/blocked-time.entity';
import { Reservation } from '../entities/reservation.entity';

describe('ReservationCapacityService', () => {
  let service: ReservationCapacityService;
  let businessRepo: Repository<Business>;
  let businessHoursRepo: Repository<BusinessOperatingHours>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationCapacityService,
        {
          provide: getRepositoryToken(Business),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BusinessOperatingHours),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BlockedTime),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<ReservationCapacityService>(
      ReservationCapacityService,
    );
    businessRepo = module.get<Repository<Business>>(
      getRepositoryToken(Business),
    );
    businessHoursRepo = module.get<Repository<BusinessOperatingHours>>(
      getRepositoryToken(BusinessOperatingHours),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw BadRequestException if business not found', async () => {
    jest.spyOn(businessRepo, 'findOne').mockResolvedValue(null);

    await expect(
      service.validateReservationCapacity(99, '2026-06-20', '18:00', 4),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if reservation time is blocked', async () => {
    const business = {
      id: 1,
      timezone: 'Asia/Jakarta',
      settings: { capacity: 50, slotInterval: 15 },
      ownerUserId: 1,
    } as any;
    jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);
    mockQueryBuilder.getOne.mockResolvedValue({ id: 1 });

    await expect(
      service.validateReservationCapacity(1, '2026-06-20', '18:00', 4),
    ).rejects.toThrow(
      'Reservation date/time is blocked by business operations',
    );
  });

  it('should throw BadRequestException if business is closed', async () => {
    const business = {
      id: 1,
      timezone: 'Asia/Jakarta',
      settings: { capacity: 50, slotInterval: 15 },
    } as any;
    jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);
    mockQueryBuilder.getOne.mockResolvedValue(null); // not blocked
    jest.spyOn(businessHoursRepo, 'findOne').mockResolvedValue(null); // closed / not found

    await expect(
      service.validateReservationCapacity(1, '2026-06-20', '18:00', 4),
    ).rejects.toThrow('Business is closed on this day');
  });

  it('should throw BadRequestException if reservation time is outside business hours', async () => {
    const business = {
      id: 1,
      timezone: 'Asia/Jakarta',
      settings: { capacity: 50, slotInterval: 15 },
    } as any;
    jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);
    mockQueryBuilder.getOne.mockResolvedValue(null);

    const operatingHours = {
      id: 1,
      businessId: 1,
      dayOfWeek: 6,
      startTime: '09:00',
      endTime: '17:00',
      isClosed: false,
    } as BusinessOperatingHours;
    jest.spyOn(businessHoursRepo, 'findOne').mockResolvedValue(operatingHours);

    await expect(
      service.validateReservationCapacity(1, '2026-06-20', '18:00', 4), // Saturday, June 20, 2026 is outside 09:00-17:00
    ).rejects.toThrow('Reservation time is outside operating hours');
  });

  it('should throw BadRequestException if slot interval is invalid', async () => {
    const business = {
      id: 1,
      timezone: 'Asia/Jakarta',
      settings: { capacity: 50, slotInterval: 15 },
    } as any;
    jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);
    mockQueryBuilder.getOne.mockResolvedValue(null);

    const operatingHours = {
      id: 1,
      businessId: 1,
      dayOfWeek: 6,
      startTime: '09:00',
      endTime: '20:00',
      isClosed: false,
    } as BusinessOperatingHours;
    jest.spyOn(businessHoursRepo, 'findOne').mockResolvedValue(operatingHours);

    await expect(
      service.validateReservationCapacity(1, '2026-06-20', '18:07', 4), // 18:07 not divisible by 15
    ).rejects.toThrow('Reservation time must align with 15-minute slots');
  });

  it('should throw BadRequestException if capacity is exceeded', async () => {
    const business = {
      id: 1,
      timezone: 'Asia/Jakarta',
      settings: { capacity: 50, slotInterval: 15 },
    } as any;
    jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);
    mockQueryBuilder.getOne.mockResolvedValue(null);

    const operatingHours = {
      id: 1,
      businessId: 1,
      dayOfWeek: 6,
      startTime: '09:00',
      endTime: '20:00',
      isClosed: false,
    } as BusinessOperatingHours;
    jest.spyOn(businessHoursRepo, 'findOne').mockResolvedValue(operatingHours);

    // Occupancy check sum is 48
    mockQueryBuilder.getRawOne.mockResolvedValue({ sum: '48' });

    await expect(
      service.validateReservationCapacity(1, '2026-06-20', '18:00', 4), // 48 + 4 = 52 > 50
    ).rejects.toThrow('Business capacity exceeded for this slot');
  });

  it('should succeed if capacity and parameters are valid', async () => {
    const business = {
      id: 1,
      timezone: 'Asia/Jakarta',
      settings: { capacity: 50, slotInterval: 15 },
    } as any;
    jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);
    mockQueryBuilder.getOne.mockResolvedValue(null);

    const operatingHours = {
      id: 1,
      businessId: 1,
      dayOfWeek: 6,
      startTime: '09:00',
      endTime: '20:00',
      isClosed: false,
    } as BusinessOperatingHours;
    jest.spyOn(businessHoursRepo, 'findOne').mockResolvedValue(operatingHours);

    // Occupancy check sum is 20
    mockQueryBuilder.getRawOne.mockResolvedValue({ sum: '20' });

    await expect(
      service.validateReservationCapacity(1, '2026-06-20', '18:00', 4), // 20 + 4 = 24 <= 50
    ).resolves.not.toThrow();
  });
});
