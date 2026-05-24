import { IsArray, IsObject, IsOptional } from 'class-validator';

export class UpdateStaffScheduleDto {
    @IsObject()
    weeklySchedule: Record<string, any>;

    @IsOptional()
    @IsArray()
    blockedDates?: string[];
}