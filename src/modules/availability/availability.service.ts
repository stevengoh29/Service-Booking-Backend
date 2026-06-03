import {
    BadRequestException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResponseUtil } from 'src/common/utils/response-util';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { In, Repository } from 'typeorm';
import { AvailabilityHourDto } from './dto/availability-hour.dto';
import { CreateBlockedTimeDto } from './dto/create-blocked-time.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { UpdateBlockedTimeDto } from './dto/update-blocked-time.dto';
import { UpdateBusinessOperatingHoursDto } from './dto/update-business-operating-hours.dto';
import { BlockedTime } from './entities/blocked-time.entity';
import { BusinessOperatingHours } from './entities/business-operating-hours.entity';

@Injectable()
export class AvailabilityService {
    constructor(
        @InjectRepository(Business)
        private readonly businessRepository: Repository<Business>,

        @InjectRepository(BusinessOperatingHours)
        private readonly businessHoursRepository: Repository<BusinessOperatingHours>,

        @InjectRepository(BlockedTime)
        private readonly blockedTimeRepository: Repository<BlockedTime>,
    ) { }

    async getBusinessHours(businessUuid: string, user: User) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);

        const hours = await this.businessHoursRepository.find({
            where: { businessId: business.id },
            order: { dayOfWeek: 'ASC' },
        });

        return ResponseUtil.success(
            hours.map((hour) => this.toBusinessHoursResponse(hour)),
            'Business operating hours fetched successfully',
        );
    }

    async updateBusinessHours(
        businessUuid: string,
        dto: UpdateBusinessOperatingHoursDto,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        this.validateHourSet(dto.hours, 'isClosed');

        await this.businessHoursRepository.manager.transaction(async (manager) => {
            for (const hourDto of dto.hours) {
                const existing = await manager.findOne(BusinessOperatingHours, {
                    where: {
                        businessId: business.id,
                        dayOfWeek: hourDto.dayOfWeek,
                    },
                });

                const isClosed = hourDto.isClosed ?? false;
                const payload = {
                    businessId: business.id,
                    dayOfWeek: hourDto.dayOfWeek,
                    startTime: isClosed ? null : hourDto.startTime!,
                    endTime: isClosed ? null : hourDto.endTime!,
                    isClosed,
                    updatedById: user.id,
                    updatedByName: user.name,
                };

                if (existing) {
                    Object.assign(existing, payload);
                    await manager.save(existing);
                    continue;
                }

                await manager.save(
                    manager.create(BusinessOperatingHours, {
                        ...payload,
                        createdById: user.id,
                        createdByName: user.name,
                    }),
                );
            }
        });

        return this.getBusinessHours(businessUuid, user);
    }

    async createBlockedTime(
        businessUuid: string,
        dto: CreateBlockedTimeDto,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        this.validateDateTimeRange(dto.startDateTime, dto.endDateTime);

        const blockedTime = await this.blockedTimeRepository.save(
            this.blockedTimeRepository.create({
                businessId: business.id,
                startDateTime: new Date(dto.startDateTime),
                endDateTime: new Date(dto.endDateTime),
                reason: dto.reason ?? null,
                createdById: user.id,
                createdByName: user.name,
                updatedById: user.id,
                updatedByName: user.name,
            }),
        );

        return ResponseUtil.success(
            this.toBlockedTimeResponse(blockedTime),
            'Blocked time created successfully',
        );
    }

    async getBlockedTimes(
        businessUuid: string,
        query: QueryAvailabilityDto,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const queryBuilder = this.blockedTimeRepository
            .createQueryBuilder('blockedTime')
            .where('blockedTime.businessId = :businessId', { businessId: business.id })
            .orderBy('blockedTime.startDateTime', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (query.from) {
            queryBuilder.andWhere('blockedTime.endDateTime >= :from', {
                from: new Date(query.from),
            });
        }

        if (query.to) {
            queryBuilder.andWhere('blockedTime.startDateTime <= :to', {
                to: new Date(query.to),
            });
        }

        const [blockedTimes, total] = await queryBuilder.getManyAndCount();

        return ResponseUtil.success(
            {
                items: blockedTimes.map((blockedTime) =>
                    this.toBlockedTimeResponse(blockedTime),
                ),
                meta: this.toPaginationMeta(page, limit, total),
            },
            'Blocked times fetched successfully',
        );
    }

    async updateBlockedTime(
        businessUuid: string,
        blockedTimeUuid: string,
        dto: UpdateBlockedTimeDto,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        const blockedTime = await this.findBlockedTimeByUuidOrFail(
            business.id,
            blockedTimeUuid,
        );

        const nextStart = dto.startDateTime ?? blockedTime.startDateTime.toISOString();
        const nextEnd = dto.endDateTime ?? blockedTime.endDateTime.toISOString();
        this.validateDateTimeRange(nextStart, nextEnd);

        if (dto.startDateTime !== undefined) blockedTime.startDateTime = new Date(dto.startDateTime);
        if (dto.endDateTime !== undefined) blockedTime.endDateTime = new Date(dto.endDateTime);
        if (dto.reason !== undefined) blockedTime.reason = dto.reason;
        blockedTime.updatedById = user.id;
        blockedTime.updatedByName = user.name;

        const saved = await this.blockedTimeRepository.save(blockedTime);

        return ResponseUtil.success(
            this.toBlockedTimeResponse(saved),
            'Blocked time updated successfully',
        );
    }

    async deleteBlockedTime(
        businessUuid: string,
        blockedTimeUuid: string,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        const blockedTime = await this.findBlockedTimeByUuidOrFail(
            business.id,
            blockedTimeUuid,
        );

        blockedTime.updatedById = user.id;
        blockedTime.updatedByName = user.name;
        await this.blockedTimeRepository.save(blockedTime);
        await this.blockedTimeRepository.softRemove(blockedTime);

        return ResponseUtil.success(null, 'Blocked time deleted successfully');
    }

    private async findBusinessByUuidOrFail(businessUuid: string) {
        const business = await this.businessRepository.findOne({
            where: { uuid: businessUuid },
        });

        if (!business) {
            throw new NotFoundException('Business not found');
        }

        return business;
    }

    private async findBlockedTimeByUuidOrFail(
        businessId: number,
        blockedTimeUuid: string,
    ) {
        const blockedTime = await this.blockedTimeRepository.findOne({
            where: {
                businessId,
                uuid: blockedTimeUuid,
            },
        });

        if (!blockedTime) {
            throw new NotFoundException('Blocked time not found');
        }

        return blockedTime;
    }

    private validateHourSet(
        hours: AvailabilityHourDto[],
        closedFlag: 'isClosed' | 'isOffDay',
    ) {
        const days = new Set<number>();

        for (const hour of hours) {
            if (days.has(hour.dayOfWeek)) {
                throw new BadRequestException('Only one record is allowed per day');
            }

            days.add(hour.dayOfWeek);
            const isClosed = hour[closedFlag] ?? false;

            if (isClosed) continue;

            if (!hour.startTime || !hour.endTime) {
                console.log(hour)
                throw new BadRequestException('Start time and end time are required');
            }

            if (hour.endTime <= hour.startTime) {
                throw new BadRequestException('End time must be after start time');
            }
        }
    }

    private async validateStaffHoursWithinBusinessHours(
        businessId: number,
        hours: AvailabilityHourDto[],
    ) {
        const businessHours = await this.businessHoursRepository.find({
            where: {
                businessId,
                dayOfWeek: In(hours.map((hour) => hour.dayOfWeek)),
            },
        });
        const businessHoursByDay = new Map(
            businessHours.map((hour) => [hour.dayOfWeek, hour]),
        );

        for (const hour of hours) {
            if (hour.isOffDay) continue;

            const businessHour = businessHoursByDay.get(hour.dayOfWeek);

            if (!businessHour || businessHour.isClosed) {
                throw new BadRequestException(
                    'Staff working hours cannot be set on a closed business day',
                );
            }

            if (
                !businessHour.startTime ||
                !businessHour.endTime ||
                !hour.startTime ||
                !hour.endTime ||
                hour.startTime < businessHour.startTime ||
                hour.endTime > businessHour.endTime
            ) {
                throw new BadRequestException(
                    'Staff working hours must stay within business operating hours',
                );
            }
        }
    }

    private validateDateRange(startDate: string, endDate: string) {
        if (endDate < startDate) {
            throw new BadRequestException('End date must be on or after start date');
        }
    }

    private validateDateTimeRange(startDateTime: string, endDateTime: string) {
        const start = new Date(startDateTime);
        const end = new Date(endDateTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new BadRequestException('Invalid date time range');
        }

        if (end <= start) {
            throw new BadRequestException('End date time must be after start date time');
        }
    }

    private toBusinessHoursResponse(hour: BusinessOperatingHours) {
        return {
            uuid: hour.uuid,
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime,
            endTime: hour.endTime,
            isClosed: hour.isClosed,
            createdAt: hour.createdAt,
            updatedAt: hour.updatedAt,
        };
    }

    private toBlockedTimeResponse(blockedTime: BlockedTime) {
        return {
            uuid: blockedTime.uuid,
            startDateTime: blockedTime.startDateTime,
            endDateTime: blockedTime.endDateTime,
            reason: blockedTime.reason,
            createdAt: blockedTime.createdAt,
            updatedAt: blockedTime.updatedAt,
        };
    }

    private toPaginationMeta(page: number, limit: number, total: number) {
        return {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }
}
