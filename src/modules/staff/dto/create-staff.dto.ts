import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { StaffRole } from '../enums/staff-role.enum';

export class CreateStaffDto {
    @IsString()
    @MaxLength(120)
    name: string;

    @IsOptional()
    @IsString()
    photoUrl?: string;

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
    @IsObject()
    weeklySchedule?: Record<string, any>;

    @IsOptional()
    @IsInt()
    @Min(0)
    bufferMinutes?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}