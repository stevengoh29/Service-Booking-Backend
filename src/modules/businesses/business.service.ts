import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { slugify } from 'src/common/utils/slugify.util';
import { UPLOAD_PUBLIC_BUCKET } from '../uploads/constants/upload.constants';
import { UploadsService } from '../uploads/uploads.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { BusinessSettingsKey } from './enums/business-settings-key.enum';
import { Business } from './entities/business.entity';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly uploadsService: UploadsService,
  ) { }

  async createBusiness(userId: number, dto: CreateBusinessDto) {
    const existingBusiness = await this.businessRepository.findOne({
      where: { ownerUserId: userId },
    });

    if (existingBusiness) {
      throw new ConflictException(
        'Phase 1 supports only one business per owner',
      );
    }

    const baseSlug = dto.slug || slugify(dto.name);
    const slug = await this.generateUniqueSlug(baseSlug);

    const { logoUploadUuid, logo, ...businessDto } = dto;

    if (dto.capacityRules) {
      this.validateCapacityRules(dto.capacityRules);
    }

    const business = this.businessRepository.create({
      ...businessDto,
      slug,
      ownerUserId: userId,
      timezone: 'Asia/Jakarta',
      locale: 'id-ID',
      currency: 'IDR',
    });

    const savedBusiness = await this.businessRepository.save(business);

    if (logoUploadUuid) {
      const attachedUpload = await this.uploadsService.attachUpload(userId, {
        uploadUuid: logoUploadUuid,
        entityType: 'BUSINESS',
        entityUuid: savedBusiness.uuid,
      });

      savedBusiness.logo = attachedUpload.filePath;
      return await this.businessRepository.save(savedBusiness);
    }

    return savedBusiness;
  }

  async getMyBusiness(userId: number) {
    const business = await this.businessRepository.findOne({
      where: { ownerUserId: userId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async updateMyBusiness(userId: number, dto: UpdateBusinessDto) {
    const business = await this.getMyBusiness(userId);

    if (dto.slug && dto.slug !== business.slug) {
      dto.slug = await this.generateUniqueSlug(dto.slug, business.id);
    }

    const { logoUploadUuid, logo, ...businessDto } = dto;
    if (dto.capacityRules) {
      this.validateCapacityRules(dto.capacityRules);
    }
    const previousLogo = business.logo;
    Object.assign(business, businessDto);

    if (logoUploadUuid) {
      const attachedUpload = await this.uploadsService.attachUpload(userId, {
        uploadUuid: logoUploadUuid,
        entityType: 'BUSINESS',
        entityUuid: business.uuid,
      });

      business.logo = attachedUpload.filePath;
    }

    const savedBusiness = await this.businessRepository.save(business);

    if (previousLogo && previousLogo !== savedBusiness.logo) {
      await this.deletePreviousLogo(previousLogo);
    }

    return savedBusiness;
  }

  private validateCapacityRules(rules: any[]) {
    if (!Array.isArray(rules)) {
      throw new BadRequestException('capacityRules must be an array');
    }

    const normalized = rules.map((r, idx) => {
      if (
        typeof r.minPartySize !== 'number' ||
        typeof r.maxPartySize !== 'number' ||
        typeof r.maxActiveReservations !== 'number'
      ) {
        throw new BadRequestException(
          `capacityRules[${idx}] must contain numeric minPartySize, maxPartySize, and maxActiveReservations`,
        );
      }

      if (!Number.isInteger(r.minPartySize) || !Number.isInteger(r.maxPartySize) || !Number.isInteger(r.maxActiveReservations)) {
        throw new BadRequestException('capacityRules values must be integers');
      }

      if (r.minPartySize < 1) {
        throw new BadRequestException('minPartySize must be >= 1');
      }

      if (r.maxPartySize < r.minPartySize) {
        throw new BadRequestException('maxPartySize must be >= minPartySize');
      }

      if (r.maxActiveReservations < 0) {
        throw new BadRequestException('maxActiveReservations must be >= 0');
      }

      return {
        min: r.minPartySize,
        max: r.maxPartySize,
      };
    });

    // sort and check duplicates/overlaps
    normalized.sort((a, b) => a.min - b.min);

    for (let i = 0; i < normalized.length - 1; i++) {
      const curr = normalized[i];
      const next = normalized[i + 1];

      if (curr.min === next.min && curr.max === next.max) {
        throw new BadRequestException('Duplicate capacity rule ranges are not allowed');
      }

      // overlapping or touching ranges are not allowed (inclusive ranges)
      if (next.min <= curr.max) {
        throw new BadRequestException('Capacity rule ranges must not overlap');
      }
    }
  }

  async getSettingsByUuid(businessUuid: string) {
    const business = await this.businessRepository.findOne({
      where: { uuid: businessUuid },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business.settings || {};
  }

  async updateSettingsByUuid(businessUuid: string, newSettings: Record<string, any>) {
    const business = await this.businessRepository.findOne({
      where: { uuid: businessUuid },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const allowedKeys = Object.values(BusinessSettingsKey) as string[];
    for (const key of Object.keys(newSettings)) {
      if (!allowedKeys.includes(key)) {
        throw new BadRequestException(`Invalid settings key: ${key}`);
      }
    }

    business.settings = { ...(business.settings || {}), ...newSettings };

    return await this.businessRepository.save(business);
  }

  private async deletePreviousLogo(filePath: string): Promise<void> {
    try {
      await this.uploadsService.deleteFile({
        bucket: UPLOAD_PUBLIC_BUCKET,
        filePath,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to delete previous business logo ${filePath}: ${error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async generateUniqueSlug(
    baseSlug: string,
    excludeId?: number,
  ): Promise<string> {
    let slug = slugify(baseSlug);
    let counter = 1;

    while (true) {
      const existing = await this.businessRepository.findOne({
        where: { slug },
      });

      if (!existing || existing.id === excludeId) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}
