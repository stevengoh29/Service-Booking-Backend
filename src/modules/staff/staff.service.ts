import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ResponseUtil } from 'src/common/utils/response-util';
import { slugify } from 'src/common/utils/slugify.util';
import { Repository } from 'typeorm';
import { Business } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffStatusDto } from './dto/update-staff-status.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Staff } from './entities/staff.entity';
import { StaffRole } from './enums/staff-role.enum';

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
        await this.assertCanManageStaff(business, user);

        const slug = slugify(dto.displayName);

        const existing = await this.staffRepository.findOne({
            where: {
                businessId: business.id,
                slug,
            },
        });

        if (existing) {
            throw new ConflictException('Staff slug already exists');
        }

        if (dto.role === StaffRole.BUSINESS_OWNER) {
            await this.assertNoExistingBusinessOwner(business.id);
        }

        const staff = this.staffRepository.create({
            businessId: business.id,
            displayName: dto.displayName,
            email: dto.email,
            profileImageUrl: dto.profileImageUrl,
            role: dto.role,
            phone: dto.phone,
            whatsappNumber: dto.whatsappNumber,
            bio: dto.bio,
            bufferMinutes: dto.bufferMinutes,
            isActive: dto.isActive,
            slug,
            joinedAt: new Date(),
            createdById: user.id,
            createdByName: user.name,
            updatedById: user.id,
            updatedByName: user.name,
        });

        await this.staffRepository.save(staff);

        return ResponseUtil.success(
            plainToInstance(Staff, staff),
            'Staff created successfully',
        );
    }

    async findAll(
        businessUuid: string,
        query: QueryStaffDto,
        user: User,
    ) {
        const business = await this.findBusinessOrFail(businessUuid);
        await this.assertCanViewAllStaff(business, user);

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
            plainToInstance(Staff, staff),
            'Staff fetched successfully',
        );
    }

    async findOne(businessUuid: string, staffUuid: string, user: User) {
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

        await this.assertCanViewStaff(business, user, staff);

        return ResponseUtil.success(
            plainToInstance(Staff, staff),
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

        const canManage = await this.canManageStaff(business, user);

        if (!canManage) {
            if (staff.userId !== user.id || !this.hasOnlyOwnProfileUpdates(dto)) {
                throw new ForbiddenException('You cannot update this staff profile');
            }
        } else {
            this.assertCanModifyTargetStaff(business, user, staff);
        }

        if (
            dto.role === StaffRole.BUSINESS_OWNER &&
            staff.role !== StaffRole.BUSINESS_OWNER
        ) {
            await this.assertNoExistingBusinessOwner(business.id);
        }

        this.applyStaffUpdates(staff, dto);

        staff.updatedById = user.id;
        staff.updatedByName = user.name;

        await this.staffRepository.save(staff);

        return ResponseUtil.success(
            plainToInstance(Staff, staff),
            'Staff updated successfully',
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
        return this.deactivate(businessUuid, staffUuid, user);
    }

    async deactivate(
        businessUuid: string,
        staffUuid: string,
        user: User,
    ) {
        const business = await this.findBusinessOrFail(businessUuid);
        await this.assertCanManageStaff(business, user);

        const staff = await this.staffRepository.findOne({
            where: {
                uuid: staffUuid,
                businessId: business.id,
            },
        });

        if (!staff) {
            throw new NotFoundException('Staff not found');
        }

        this.assertCanModifyTargetStaff(business, user, staff);

        staff.isActive = false;
        staff.updatedById = user.id;
        staff.updatedByName = user.name;

        await this.staffRepository.save(staff);

        return ResponseUtil.success(
            null,
            'Staff deactivated successfully',
        );
    }

    async activate(
        businessUuid: string,
        staffUuid: string,
        user: User,
    ) {
        const business = await this.findBusinessOrFail(businessUuid);
        await this.assertCanManageStaff(business, user);

        const staff = await this.staffRepository.findOne({
            where: {
                uuid: staffUuid,
                businessId: business.id,
            },
        });

        if (!staff) {
            throw new NotFoundException('Staff not found');
        }

        this.assertCanModifyTargetStaff(business, user, staff);

        staff.isActive = true;
        staff.updatedById = user.id;
        staff.updatedByName = user.name;

        await this.staffRepository.save(staff);

        return ResponseUtil.success(
            plainToInstance(Staff, staff),
            'Staff activated successfully',
        );
    }

    private async assertNoExistingBusinessOwner(businessId: number) {
        const existingOwner = await this.staffRepository.findOne({
            where: {
                businessId,
                role: StaffRole.BUSINESS_OWNER,
            },
        });

        if (existingOwner) {
            throw new ConflictException('Business owner staff already exists');
        }
    }

    private async assertCanViewAllStaff(business: Business, user: User) {
        if (business.ownerUserId === user.id) return;

        const staff = await this.findActiveStaffForUser(business.id, user.id);

        if (
            staff?.role === StaffRole.BUSINESS_OWNER ||
            staff?.role === StaffRole.BUSINESS_ADMIN
        ) {
            return;
        }

        throw new ForbiddenException('You cannot view staff for this business');
    }

    private async assertCanViewStaff(
        business: Business,
        user: User,
        targetStaff: Staff,
    ) {
        if (business.ownerUserId === user.id) return;
        if (targetStaff.userId === user.id) return;

        const staff = await this.findActiveStaffForUser(business.id, user.id);

        if (
            staff?.role === StaffRole.BUSINESS_OWNER ||
            staff?.role === StaffRole.BUSINESS_ADMIN
        ) {
            return;
        }

        throw new ForbiddenException('You cannot view this staff profile');
    }

    private async assertCanManageStaff(business: Business, user: User) {
        if (await this.canManageStaff(business, user)) return;

        throw new ForbiddenException('You cannot manage staff for this business');
    }

    private async canManageStaff(business: Business, user: User): Promise<boolean> {
        if (business.ownerUserId === user.id) return true;

        const staff = await this.findActiveStaffForUser(business.id, user.id);

        if (
            staff?.role === StaffRole.BUSINESS_OWNER ||
            staff?.role === StaffRole.BUSINESS_ADMIN
        ) {
            return true;
        }

        return false;
    }

    private async findActiveStaffForUser(
        businessId: number,
        userId: number,
    ): Promise<Staff | null> {
        return this.staffRepository.findOne({
            where: {
                businessId,
                userId,
                isActive: true,
            },
        });
    }

    private assertCanModifyTargetStaff(
        business: Business,
        user: User,
        targetStaff: Staff,
    ) {
        if (business.ownerUserId === user.id) return;

        if (targetStaff.role === StaffRole.BUSINESS_OWNER) {
            throw new ForbiddenException('Business admin cannot modify business owner staff');
        }
    }

    private hasOnlyOwnProfileUpdates(dto: UpdateStaffDto): boolean {
        const allowedFields = new Set([
            'displayName',
            'email',
            'profileImageUrl',
            'phone',
            'whatsappNumber',
            'bio',
        ]);

        return Object.keys(dto).every((key) => allowedFields.has(key));
    }

    private applyStaffUpdates(
        staff: Staff,
        dto: UpdateStaffDto | UpdateStaffStatusDto,
    ) {
        if ('displayName' in dto && dto.displayName !== undefined) {
            staff.displayName = dto.displayName;
            staff.slug = slugify(dto.displayName);
        }

        if ('email' in dto && dto.email !== undefined) {
            staff.email = dto.email;
        }

        if ('profileImageUrl' in dto) {
            staff.profileImageUrl = dto.profileImageUrl;
        }

        if ('role' in dto && dto.role !== undefined) {
            staff.role = dto.role;
        }

        if ('phone' in dto) {
            staff.phone = dto.phone;
        }

        if ('whatsappNumber' in dto) {
            staff.whatsappNumber = dto.whatsappNumber;
        }

        if ('bio' in dto) {
            staff.bio = dto.bio;
        }

        if ('bufferMinutes' in dto && dto.bufferMinutes !== undefined) {
            staff.bufferMinutes = dto.bufferMinutes;
        }

        if ('isActive' in dto && dto.isActive !== undefined) {
            staff.isActive = dto.isActive;
        }
    }
}
