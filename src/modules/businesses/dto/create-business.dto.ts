// src/modules/businesses/dto/create-business.dto.ts

import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  Matches,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionTier } from '../enums/subscription-tier.enum';

export class CapacityRuleDto {
  @IsInt()
  @Min(1)
  minPartySize: number;

  @IsInt()
  @Min(1)
  maxPartySize: number;

  @IsInt()
  @Min(0)
  maxActiveReservations: number;
}

export class CreateBusinessDto {

  /**
   * Reservation capacity rules per party size ranges
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapacityRuleDto)
  capacityRules?: CapacityRuleDto[];

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

  @IsOptional()
  @IsUUID()
  logoUploadUuid?: string;

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

  @IsOptional()
  @IsString()
  @Length(2, 100)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  timezone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  locale?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  currency?: string;

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
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
