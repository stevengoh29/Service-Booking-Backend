import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResponseUtil } from 'src/common/utils/response-util';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Staff } from 'src/modules/staff/entities/staff.entity';
import { StaffRole } from 'src/modules/staff/enums/staff-role.enum';
import { User } from 'src/modules/users/entities/user.entity';
import { In, Repository } from 'typeorm';
import { AvailabilityHourDto } from './dto/availability-hour.dto';
import { CreateBlockedTimeDto } from './dto/create-blocked-time.dto';
import { CreateStaffLeaveDto } from './dto/create-staff-leave.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { UpdateBlockedTimeDto } from './dto/update-blocked-time.dto';
import { UpdateBusinessOperatingHoursDto } from './dto/update-business-operating-hours.dto';
import { UpdateStaffLeaveDto } from './dto/update-staff-leave.dto';
import { UpdateStaffWorkingHoursDto } from './dto/update-staff-working-hours.dto';
import { BlockedTime } from './entities/blocked-time.entity';
import { BusinessOperatingHours } from './entities/business-operating-hours.entity';
import { StaffLeave } from './entities/staff-leave.entity';
import { StaffWorkingHours } from './entities/staff-working-hours.entity';

@Injectable()
export class AvailabilityService {
    constructor(
        @InjectRepository(Business)
        private readonly businessRepository: Repository<Business>,

        @InjectRepository(Staff)
        private readonly staffRepository: Repository<Staff>,

        @InjectRepository(BusinessOperatingHours)
        private readonly businessHoursRepository: Repository<BusinessOperatingHours>,

        @InjectRepository(StaffWorkingHours)
        private readonly staffHoursRepository: Repository<StaffWorkingHours>,

        @InjectRepository(StaffLeave)
        private readonly staffLeaveRepository: Repository<StaffLeave>,

        @InjectRepository(BlockedTime)
        private readonly blockedTimeRepository: Repository<BlockedTime>,
    ) { }

    async getBusinessHours(businessUuid: string, user: User) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        await this.assertCanViewBusinessAvailability(business, user);

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
        await this.assertCanManageAvailability(business, user);
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

    async getStaffWorkingHours(
        businessUuid: string,
        staffUuid: string,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        const staff = await this.findStaffByUuidOrFail(business.id, staffUuid);
        await this.assertCanViewStaffAvailability(business, staff, user);

        const hours = await this.staffHoursRepository.find({
            where: {
                businessId: business.id,
                staffId: staff.id,
            },
            order: { dayOfWeek: 'ASC' },
        });

        return ResponseUtil.success(
            {
                staff: this.toStaffSummary(staff),
                hours: hours.map((hour) => this.toStaffHoursResponse(hour)),
            },
            'Staff working hours fetched successfully',
        );
    }

    async updateStaffWorkingHours(
        businessUuid: string,
        staffUuid: string,
        dto: UpdateStaffWorkingHoursDto,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        await this.assertCanManageAvailability(business, user);
        const staff = await this.findStaffByUuidOrFail(business.id, staffUuid);
        this.validateHourSet(dto.hours, 'isOffDay');
        await this.validateStaffHoursWithinBusinessHours(business.id, dto.hours);

        await this.staffHoursRepository.manager.transaction(async (manager) => {
            for (const hourDto of dto.hours) {
                const existing = await manager.findOne(StaffWorkingHours, {
                    where: {
                        businessId: business.id,
                        staffId: staff.id,
                        dayOfWeek: hourDto.dayOfWeek,
                    },
                });

                const isOffDay = hourDto.isOffDay ?? false;
                const payload = {
                    businessId: business.id,
                    staffId: staff.id,
                    dayOfWeek: hourDto.dayOfWeek,
                    startTime: isOffDay ? null : hourDto.startTime!,
                    endTime: isOffDay ? null : hourDto.endTime!,
                    isOffDay,
                    updatedById: user.id,
                    updatedByName: user.name,
                };

                if (existing) {
                    Object.assign(existing, payload);
                    await manager.save(existing);
                    continue;
                }

                await manager.save(
                    manager.create(StaffWorkingHours, {
                        ...payload,
                        createdById: user.id,
                        createdByName: user.name,
                    }),
                );
            }
        });

        return this.getStaffWorkingHours(businessUuid, staffUuid, user);
    }

    async createStaffLeave(
        businessUuid: string,
        staffUuid: string,
        dto: CreateStaffLeaveDto,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        await this.assertCanManageAvailability(business, user);
        const staff = await this.findStaffByUuidOrFail(business.id, staffUuid);
        this.validateDateRange(dto.startDate, dto.endDate);

        const leave = await this.staffLeaveRepository.save(
            this.staffLeaveRepository.create({
                businessId: business.id,
                staffId: staff.id,
                startDate: dto.startDate,
                endDate: dto.endDate,
                reason: dto.reason ?? null,
                isApproved: dto.isApproved ?? false,
                createdById: user.id,
                createdByName: user.name,
                updatedById: user.id,
                updatedByName: user.name,
            }),
        );

        return ResponseUtil.success(
            this.toStaffLeaveResponse(leave, staff),
            'Staff leave created successfully',
        );
    }

    async getStaffLeaves(
        businessUuid: string,
        staffUuid: string,
        query: QueryAvailabilityDto,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        const staff = await this.findStaffByUuidOrFail(business.id, staffUuid);
        await this.assertCanViewStaffAvailability(business, staff, user);

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const queryBuilder = this.staffLeaveRepository
            .createQueryBuilder('leave')
            .where('leave.businessId = :businessId', { businessId: business.id })
            .andWhere('leave.staffId = :staffId', { staffId: staff.id })
            .orderBy('leave.startDate', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (query.approvedOnly === 'true') {
            queryBuilder.andWhere('leave.isApproved = true');
        }

        if (query.from) {
            queryBuilder.andWhere('leave.endDate >= :from', { from: query.from });
        }

        if (query.to) {
            queryBuilder.andWhere('leave.startDate <= :to', { to: query.to });
        }

        const [leaves, total] = await queryBuilder.getManyAndCount();

        return ResponseUtil.success(
            {
                items: leaves.map((leave) => this.toStaffLeaveResponse(leave, staff)),
                meta: this.toPaginationMeta(page, limit, total),
            },
            'Staff leave fetched successfully',
        );
    }

    async updateStaffLeave(
        businessUuid: string,
        staffUuid: string,
        leaveUuid: string,
        dto: UpdateStaffLeaveDto,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        await this.assertCanManageAvailability(business, user);
        const staff = await this.findStaffByUuidOrFail(business.id, staffUuid);
        const leave = await this.findLeaveByUuidOrFail(business.id, staff.id, leaveUuid);

        const nextStartDate = dto.startDate ?? leave.startDate;
        const nextEndDate = dto.endDate ?? leave.endDate;
        this.validateDateRange(nextStartDate, nextEndDate);

        if (dto.startDate !== undefined) leave.startDate = dto.startDate;
        if (dto.endDate !== undefined) leave.endDate = dto.endDate;
        if (dto.reason !== undefined) leave.reason = dto.reason;
        if (dto.isApproved !== undefined) leave.isApproved = dto.isApproved;
        leave.updatedById = user.id;
        leave.updatedByName = user.name;

        const saved = await this.staffLeaveRepository.save(leave);

        return ResponseUtil.success(
            this.toStaffLeaveResponse(saved, staff),
            'Staff leave updated successfully',
        );
    }

    async deleteStaffLeave(
        businessUuid: string,
        staffUuid: string,
        leaveUuid: string,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        await this.assertCanManageAvailability(business, user);
        const staff = await this.findStaffByUuidOrFail(business.id, staffUuid);
        const leave = await this.findLeaveByUuidOrFail(business.id, staff.id, leaveUuid);

        leave.updatedById = user.id;
        leave.updatedByName = user.name;
        await this.staffLeaveRepository.save(leave);
        await this.staffLeaveRepository.softRemove(leave);

        return ResponseUtil.success(null, 'Staff leave deleted successfully');
    }

    async createBlockedTime(
        businessUuid: string,
        dto: CreateBlockedTimeDto,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        await this.assertCanManageAvailability(business, user);
        const staff = dto.staffUuid
            ? await this.findStaffByUuidOrFail(business.id, dto.staffUuid)
            : null;
        this.validateDateTimeRange(dto.startDateTime, dto.endDateTime);

        const blockedTime = await this.blockedTimeRepository.save(
            this.blockedTimeRepository.create({
                businessId: business.id,
                staffId: staff?.id ?? null,
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
            this.toBlockedTimeResponse(blockedTime, staff),
            'Blocked time created successfully',
        );
    }

    async getBlockedTimes(
        businessUuid: string,
        query: QueryAvailabilityDto,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        const staffContext = await this.getStaffContext(business.id, user.id);
        const canManage = this.canManageAvailability(business, user, staffContext);

        if (!canManage && staffContext?.role !== StaffRole.STAFF) {
            throw new ForbiddenException('You cannot view blocked times for this business');
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const queryBuilder = this.blockedTimeRepository
            .createQueryBuilder('blockedTime')
            .where('blockedTime.businessId = :businessId', { businessId: business.id })
            .orderBy('blockedTime.startDateTime', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (query.staffUuid) {
            const staff = await this.findStaffByUuidOrFail(business.id, query.staffUuid);
            queryBuilder.andWhere('blockedTime.staffId = :staffId', { staffId: staff.id });
        } else if (!canManage && staffContext) {
            queryBuilder.andWhere(
                '(blockedTime.staffId IS NULL OR blockedTime.staffId = :staffId)',
                { staffId: staffContext.id },
            );
        }

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
        const staffById = await this.getStaffResponseMap(blockedTimes);

        return ResponseUtil.success(
            {
                items: blockedTimes.map((blockedTime) =>
                    this.toBlockedTimeResponse(
                        blockedTime,
                        blockedTime.staffId ? staffById.get(blockedTime.staffId) ?? null : null,
                    ),
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
        await this.assertCanManageAvailability(business, user);
        const blockedTime = await this.findBlockedTimeByUuidOrFail(
            business.id,
            blockedTimeUuid,
        );
        const staff = dto.staffUuid
            ? await this.findStaffByUuidOrFail(business.id, dto.staffUuid)
            : blockedTime.staffId
                ? await this.findStaffByIdOrFail(business.id, blockedTime.staffId)
                : null;

        const nextStart = dto.startDateTime ?? blockedTime.startDateTime.toISOString();
        const nextEnd = dto.endDateTime ?? blockedTime.endDateTime.toISOString();
        this.validateDateTimeRange(nextStart, nextEnd);

        if (dto.staffUuid !== undefined) blockedTime.staffId = staff?.id ?? null;
        if (dto.startDateTime !== undefined) blockedTime.startDateTime = new Date(dto.startDateTime);
        if (dto.endDateTime !== undefined) blockedTime.endDateTime = new Date(dto.endDateTime);
        if (dto.reason !== undefined) blockedTime.reason = dto.reason;
        blockedTime.updatedById = user.id;
        blockedTime.updatedByName = user.name;

        const saved = await this.blockedTimeRepository.save(blockedTime);

        return ResponseUtil.success(
            this.toBlockedTimeResponse(saved, staff),
            'Blocked time updated successfully',
        );
    }

    async deleteBlockedTime(
        businessUuid: string,
        blockedTimeUuid: string,
        user: User,
    ) {
        const business = await this.findBusinessByUuidOrFail(businessUuid);
        await this.assertCanManageAvailability(business, user);
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

    private async findStaffByUuidOrFail(businessId: number, staffUuid: string) {
        const staff = await this.staffRepository.findOne({
            where: {
                businessId,
                uuid: staffUuid,
            },
        });

        if (!staff) {
            throw new NotFoundException('Staff not found');
        }

        return staff;
    }

    private async findStaffByIdOrFail(businessId: number, staffId: number) {
        const staff = await this.staffRepository.findOne({
            where: {
                businessId,
                id: staffId,
            },
        });

        if (!staff) {
            throw new NotFoundException('Staff not found');
        }

        return staff;
    }

    private async findLeaveByUuidOrFail(
        businessId: number,
        staffId: number,
        leaveUuid: string,
    ) {
        const leave = await this.staffLeaveRepository.findOne({
            where: {
                businessId,
                staffId,
                uuid: leaveUuid,
            },
        });

        if (!leave) {
            throw new NotFoundException('Staff leave not found');
        }

        return leave;
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

    private async assertCanViewBusinessAvailability(business: Business, user: User) {
        if (business.ownerUserId === user.id) return;

        const staff = await this.getStaffContext(business.id, user.id);

        if (staff) return;

        throw new ForbiddenException('You cannot view availability for this business');
    }

    private async assertCanViewStaffAvailability(
        business: Business,
        staff: Staff,
        user: User,
    ) {
        if (business.ownerUserId === user.id) return;
        if (staff.userId === user.id) return;

        const actorStaff = await this.getStaffContext(business.id, user.id);

        if (
            actorStaff?.role === StaffRole.BUSINESS_OWNER ||
            actorStaff?.role === StaffRole.BUSINESS_ADMIN
        ) {
            return;
        }

        throw new ForbiddenException('You cannot view this staff availability');
    }

    private async assertCanManageAvailability(business: Business, user: User) {
        const staff = await this.getStaffContext(business.id, user.id);

        if (this.canManageAvailability(business, user, staff)) return;

        throw new ForbiddenException('You cannot manage availability for this business');
    }

    private canManageAvailability(
        business: Business,
        user: User,
        staff: Staff | null,
    ) {
        return (
            business.ownerUserId === user.id ||
            staff?.role === StaffRole.BUSINESS_OWNER ||
            staff?.role === StaffRole.BUSINESS_ADMIN
        );
    }

    private async getStaffContext(businessId: number, userId: number) {
        return this.staffRepository.findOne({
            where: {
                businessId,
                userId,
                isActive: true,
            },
        });
    }

    private async getStaffResponseMap(blockedTimes: BlockedTime[]) {
        const staffIds = [
            ...new Set(
                blockedTimes
                    .map((blockedTime) => blockedTime.staffId)
                    .filter((staffId): staffId is number => staffId !== null),
            ),
        ];

        if (staffIds.length === 0) {
            return new Map<number, Staff>();
        }

        const staff = await this.staffRepository.find({
            where: { id: In(staffIds) },
        });

        return new Map(staff.map((staffMember) => [staffMember.id, staffMember]));
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

    private toStaffHoursResponse(hour: StaffWorkingHours) {
        return {
            uuid: hour.uuid,
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime,
            endTime: hour.endTime,
            isOffDay: hour.isOffDay,
            createdAt: hour.createdAt,
            updatedAt: hour.updatedAt,
        };
    }

    private toStaffLeaveResponse(leave: StaffLeave, staff: Staff) {
        return {
            uuid: leave.uuid,
            staff: this.toStaffSummary(staff),
            startDate: leave.startDate,
            endDate: leave.endDate,
            reason: leave.reason,
            isApproved: leave.isApproved,
            createdAt: leave.createdAt,
            updatedAt: leave.updatedAt,
        };
    }

    private toBlockedTimeResponse(blockedTime: BlockedTime, staff: Staff | null) {
        return {
            uuid: blockedTime.uuid,
            staff: staff ? this.toStaffSummary(staff) : null,
            startDateTime: blockedTime.startDateTime,
            endDateTime: blockedTime.endDateTime,
            reason: blockedTime.reason,
            createdAt: blockedTime.createdAt,
            updatedAt: blockedTime.updatedAt,
        };
    }

    private toStaffSummary(staff: Staff) {
        return {
            uuid: staff.uuid,
            displayName: staff.displayName,
            role: staff.role,
            isActive: staff.isActive,
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
