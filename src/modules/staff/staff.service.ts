import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResponseUtil } from 'src/common/utils/response-util';
import { Repository } from 'typeorm';
import { Business } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffScheduleDto } from './dto/update-staff-schedule.dto';
import { UpdateStaffStatusDto } from './dto/update-staff-status.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Staff } from './entities/staff.entity';

@Injectable()
export class StaffService {
    constructor(
        @InjectRepository(Staff)
        private readonly staffRepository: Repository<Staff>,

        @InjectRepository(Business)
        private readonly businessRepository: Repository<Business>,
    ) { }

    async findBusinessOrFail(businessUuid: string) {
        const business = await this.businessRepository.findOne({
            where: { uuid: businessUuid },
        });

        if (!business) {
            throw new NotFoundException('Business not found');
        }

        return business;
    }

    async create(businessUuid: string, dto: CreateStaffDto, user: User) {
        const business = await this.findBusinessOrFail(businessUuid);

        const slug = dto.name.toLowerCase().replace(/\s+/g, '-');

        const existing = await this.staffRepository.findOne({
            where: {
                businessId: business.id,
                slug,
            },
        });

        if (existing) {
            throw new ConflictException('Staff slug already exists');
        }

        const staff = this.staffRepository.create({
            ...dto,
            businessId: business.id,
            slug,
            createdById: user.id,
            createdByName: user.name,
            updatedById: user.id,
            updatedByName: user.name,
        });

        await this.staffRepository.save(staff);

        return ResponseUtil.success(
            staff,
            'Staff created successfully',
        );
    }

    async findAll(
        businessUuid: string,
        query: QueryStaffDto,
    ) {
        const business = await this.findBusinessOrFail(businessUuid);

        const where: any = {
            businessId: business.id,
        };

        if (query.activeOnly === 'true') {
            where.isActive = true;
        }

        const staff = await this.staffRepository.find({
            where,
            order: {
                createdAt: 'DESC',
            },
        });

        return ResponseUtil.success(
            staff,
            'Staff fetched successfully',
        );
    }

    async findOne(businessUuid: string, staffUuid: string) {
        const business = await this.findBusinessOrFail(businessUuid);

        const staff = await this.staffRepository.findOne({
            where: {
                uuid: staffUuid,
                businessId: business.id,
            },
        });

        if (!staff) {
            throw new NotFoundException('Staff not found');
        }

        return ResponseUtil.success(
            staff,
            'Staff fetched successfully',
        );
    }

    async update(
        businessUuid: string,
        staffUuid: string,
        dto: UpdateStaffDto,
        user: User,
    ) {
        const business = await this.findBusinessOrFail(businessUuid);

        const staff = await this.staffRepository.findOne({
            where: {
                uuid: staffUuid,
                businessId: business.id,
            },
        });

        if (!staff) {
            throw new NotFoundException('Staff not found');
        }

        Object.assign(staff, dto);

        staff.updatedById = user.id;
        staff.updatedByName = user.name;

        await this.staffRepository.save(staff);

        return ResponseUtil.success(
            staff,
            'Staff updated successfully',
        );
    }

    async updateSchedule(
        businessUuid: string,
        staffUuid: string,
        dto: UpdateStaffScheduleDto,
        user: User,
    ) {
        return this.update(
            businessUuid,
            staffUuid,
            dto,
            user,
        );
    }

    async updateStatus(
        businessUuid: string,
        staffUuid: string,
        dto: UpdateStaffStatusDto,
        user: User,
    ) {
        return this.update(
            businessUuid,
            staffUuid,
            dto,
            user,
        );
    }

    async remove(
        businessUuid: string,
        staffUuid: string,
        user: User,
    ) {
        const business = await this.findBusinessOrFail(businessUuid);

        const staff = await this.staffRepository.findOne({
            where: {
                uuid: staffUuid,
                businessId: business.id,
            },
        });

        if (!staff) {
            throw new NotFoundException('Staff not found');
        }

        staff.isActive = false;
        staff.updatedById = user.id;
        staff.updatedByName = user.name;

        await this.staffRepository.save(staff);

        return ResponseUtil.success(
            null,
            'Staff deactivated successfully',
        );
    }
}