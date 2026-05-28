import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStaffLeaveDto {
    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsOptional()
    @IsString()
    @MaxLength(300)
    reason?: string;

    @IsOptional()
    @IsBoolean()
    isApproved?: boolean;
}
