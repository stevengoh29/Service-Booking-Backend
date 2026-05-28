import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min
} from 'class-validator';
import { StaffRole } from '../enums/staff-role.enum';

export class CreateStaffDto {
    @IsString()
    @MaxLength(120)
    displayName: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    profileImageUrl?: string;

    @IsOptional()
    @IsEnum(StaffRole)
    role?: StaffRole;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    whatsappNumber?: string;

    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    bufferMinutes?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
