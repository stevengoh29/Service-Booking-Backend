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
} from 'class-validator';
import { SubscriptionTier } from '../enums/subscription-tier.enum';

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
