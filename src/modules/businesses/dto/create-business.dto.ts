// src/modules/businesses/dto/create-business.dto.ts

import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsPhoneNumber,
    IsString,
    Length,
    Matches,
} from 'class-validator';
import { BusinessStaffSelectionMode } from '../enums/business-staff-selection-mode.enum';

export class CreateBusinessDto {
    /**
     * Core Brand
     */
    @IsString()
    @IsNotEmpty()
    @Length(3, 150)
    name: string;

    @IsOptional()
    @IsString()
    @Length(3, 180)
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug must be lowercase kebab-case',
    })
    slug?: string;

    @IsOptional()
    @IsString()
    logo?: string;

    /**
     * Customer Contact Layer
     */
    @IsPhoneNumber('ID')
    businessWhatsappNumber: string;

    @IsOptional()
    @IsPhoneNumber('ID')
    contactPhone?: string;

    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    /**
     * Business Location
     */
    @IsOptional()
    @IsString()
    @Length(3, 500)
    address?: string;

    @IsOptional()
    @IsString()
    @Length(2, 100)
    city?: string;

    @IsOptional()
    @IsString()
    @Length(2, 100)
    province?: string;

    /**
     * Business Category
     */
    @IsOptional()
    @IsString()
    @Length(2, 100)
    businessCategory?: string;

    /**
     * Operational Config
     */
    @IsOptional()
    @IsObject()
    operatingHours?: Record<string, any>;

    @IsOptional()
    @IsObject()
    settings?: Record<string, any>;

    /**
     * Marketing / Social
     */
    @IsOptional()
    @IsObject()
    socialLinks?: Record<string, any>;

    @IsOptional()
    @IsObject()
    seoMetadata?: Record<string, any>;

    /**
     * Internal extensibility
     */
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @IsOptional()
    @IsEnum(BusinessStaffSelectionMode)
    staffSelectionMode?: BusinessStaffSelectionMode;
}