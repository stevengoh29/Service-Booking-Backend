import {
    ConflictException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { slugify } from 'src/common/utils/slugify.util';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { Business } from './entities/business.entity';

@Injectable()
export class BusinessesService {
    constructor(
        @InjectRepository(Business)
        private readonly businessRepository: Repository<Business>,
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

        const business = this.businessRepository.create({
            ...dto,
            slug,
            ownerUserId: userId,
            timezone: 'Asia/Jakarta',
            locale: 'id-ID',
            currency: 'IDR',
        });

        return await this.businessRepository.save(business);
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

        Object.assign(business, dto);

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