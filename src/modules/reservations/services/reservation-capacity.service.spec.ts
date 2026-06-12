import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ReservationCapacityService } from './reservation-capacity.service';
import { getBusinessLocalDateString } from '../utils/timezone.util';
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
            find: jest.fn(),
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
            find: jest.fn(),
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

  describe('availability helpers', () => {
    it('getAvailableDates returns dates excluding closed days and respects minAdvancedHours for today', async () => {
      const business = {
        id: 1,
        timezone: 'UTC',
        settings: {
          maxAdvancedDays: 3,
          slotIntervalMinutes: 30,
          diningDurationMinutes: 60,
          minAdvancedHours: 2,
        },
        capacityRules: [],
      } as any;

      // Set operating hours: open all days 09:00-17:00 except dayOfWeek 2 (closed)
      const hours = [0, 1, 3, 4, 5, 6].map((d) => ({
        businessId: 1,
        dayOfWeek: d,
        startTime: '09:00',
        endTime: '17:00',
        isClosed: false,
      }));

      hours.push({ businessId: 1, dayOfWeek: 2, startTime: null as any, endTime: null as any, isClosed: true });

      jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);
      jest.spyOn(businessHoursRepo, 'find').mockResolvedValue(hours as any);

      const dates = await service.getAvailableDates(business);
      expect(dates.length).toBeGreaterThan(0);
      // none of the returned dates should fall on closed dayOfWeek=2
      for (const d of dates) {
        const dow = new Date(d).getUTCDay();
        expect(dow).not.toBe(2);
      }
    });

    it('getAvailableTimes returns empty when no capacity rule matches or when closed', async () => {
      const business = {
        id: 1,
        timezone: 'UTC',
        settings: { slotIntervalMinutes: 30, diningDurationMinutes: 60, minAdvancedHours: 0 },
        capacityRules: [],
      } as any;

      jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);

      // business closed on that day
      jest.spyOn(businessHoursRepo, 'findOne').mockResolvedValue(null);

      const times = await service.getAvailableTimes(business, '2026-06-13', 4);
      expect(times).toEqual([]);

      // open but no matching capacity rule
      const operatingHours = {
        id: 1,
        businessId: 1,
        dayOfWeek: new Date('2026-06-13').getUTCDay(),
        startTime: '09:00',
        endTime: '17:00',
        isClosed: false,
      } as any;
      jest.spyOn(businessHoursRepo, 'findOne').mockResolvedValue(operatingHours);

      const times2 = await service.getAvailableTimes(business, '2026-06-13', 4);
      expect(times2).toEqual([]);
    });

    it('getAvailableTimes respects capacity rules and overlapping reservations', async () => {
      const business = {
        id: 1,
        timezone: 'UTC',
        settings: { slotIntervalMinutes: 30, diningDurationMinutes: 60, minAdvancedHours: 0 },
        capacityRules: [{ minPartySize: 1, maxPartySize: 10, maxActiveReservations: 2 }],
      } as any;

      jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);

      const operatingHours = {
        id: 1,
        businessId: 1,
        dayOfWeek: new Date('2026-06-13').getUTCDay(),
        startTime: '09:00',
        endTime: '12:00',
        isClosed: false,
      } as any;
      jest.spyOn(businessHoursRepo, 'findOne').mockResolvedValue(operatingHours);

      // create existing reservations that overlap certain slots
      const existing = [
        { reservationTime: '09:00', status: 'CONFIRMED', guestCount: 2 },
        { reservationTime: '09:30', status: 'CONFIRMED', guestCount: 4 },
      ];
      // stub reservation repo find to return existing active reservations
      const reservationRepo = (service as any).reservationRepository as Repository<any>;
      jest.spyOn(reservationRepo, 'find').mockResolvedValue(existing as any);

      const times = await service.getAvailableTimes(business, '2026-06-13', 2);
      // slots should be generated between 09:00 and 11:00 (endTime - diningDuration)
      expect(times).toContain('11:00'.slice(0, 5));
      // because two overlapping reservations exist at 09:00 and 09:30 and maxActiveReservations=2, 09:00 slot should be full
      expect(times).not.toContain('09:00');
    });

      it('getAvailableDates excludes today when minAdvancedHours pushes earliest beyond all slots', async () => {
        const timezone = 'UTC';
        const today = getBusinessLocalDateString(timezone);

        const business = {
          id: 1,
          timezone,
          settings: {
            maxAdvancedDays: 1,
            slotIntervalMinutes: 30,
            diningDurationMinutes: 60,
            minAdvancedHours: 48,
          },
          capacityRules: [],
        } as any;

        // operating hours today open
        const hours = [0,1,2,3,4,5,6].map((d) => ({
          businessId: 1,
          dayOfWeek: d,
          startTime: '09:00',
          endTime: '17:00',
          isClosed: false,
        }));

        jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);
        jest.spyOn(businessHoursRepo, 'find').mockResolvedValue(hours as any);

        const dates = await service.getAvailableDates(business);
        expect(dates).not.toContain(today);
      });

      it('getAvailableTimes returns empty for operating hours that span midnight', async () => {
        const business = {
          id: 1,
          timezone: 'UTC',
          settings: { slotIntervalMinutes: 30, diningDurationMinutes: 60, minAdvancedHours: 0 },
          capacityRules: [ { minPartySize: 1, maxPartySize: 6, maxActiveReservations: 2 } ],
        } as any;

        jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);

        const operatingHours = {
          id: 1,
          businessId: 1,
          dayOfWeek: new Date('2026-06-13').getUTCDay(),
          startTime: '20:00',
          endTime: '04:00',
          isClosed: false,
        } as any;
        jest.spyOn(businessHoursRepo, 'findOne').mockResolvedValue(operatingHours);

        const times = await service.getAvailableTimes(business, '2026-06-13', 2);
        expect(times).toEqual([]);
      });

      it('getAvailableTimes picks correct capacity rule at party-size boundaries', async () => {
        const business = {
          id: 1,
          timezone: 'UTC',
          settings: { slotIntervalMinutes: 30, diningDurationMinutes: 60, minAdvancedHours: 0 },
          capacityRules: [
            { minPartySize: 1, maxPartySize: 2, maxActiveReservations: 1 },
            { minPartySize: 3, maxPartySize: 6, maxActiveReservations: 2 },
          ],
        } as any;

        jest.spyOn(businessRepo, 'findOne').mockResolvedValue(business);

        const operatingHours = {
          id: 1,
          businessId: 1,
          dayOfWeek: new Date('2026-06-13').getUTCDay(),
          startTime: '09:00',
          endTime: '12:00',
          isClosed: false,
        } as any;
        jest.spyOn(businessHoursRepo, 'findOne').mockResolvedValue(operatingHours);

        const existing = [
          { reservationTime: '09:00', status: 'CONFIRMED', guestCount: 2 },
        ];
        const reservationRepo = (service as any).reservationRepository as Repository<any>;
        jest.spyOn(reservationRepo, 'find').mockResolvedValue(existing as any);

        const timesFor2 = await service.getAvailableTimes(business, '2026-06-13', 2);
        // maxActiveReservations=1 -> slot 09:00 should be excluded
        expect(timesFor2).not.toContain('09:00');

        const timesFor4 = await service.getAvailableTimes(business, '2026-06-13', 4);
        // maxActiveReservations=2 and only 1 existing -> 09:00 should be present
        expect(timesFor4).toContain('09:00');
      });
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
