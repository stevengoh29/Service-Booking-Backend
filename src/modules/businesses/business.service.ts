import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { slugify } from 'src/common/utils/slugify.util';
import { UploadsService } from '../uploads/uploads.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { Business } from './entities/business.entity';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly uploadsService: UploadsService,
  ) {}

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
    Object.assign(business, businessDto);

    if (logoUploadUuid) {
      const attachedUpload = await this.uploadsService.attachUpload(userId, {
        uploadUuid: logoUploadUuid,
        entityType: 'BUSINESS',
        entityUuid: business.uuid,
      });

      business.logo = attachedUpload.filePath;
    }

    return await this.businessRepository.save(business);
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
