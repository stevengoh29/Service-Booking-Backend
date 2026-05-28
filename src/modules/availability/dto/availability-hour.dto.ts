import { IsBoolean, IsInt, IsOptional, Matches, Max, Min, ValidateIf } from 'class-validator';

export class AvailabilityHourDto {
    @IsInt()
    @Min(0)
    @Max(6)
    dayOfWeek: number;

    @ValidateIf((value: AvailabilityHourDto) => !value.isClosed && !value.isOffDay)
    @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: 'startTime must use HH:mm format',
    })
    startTime?: string;

    @ValidateIf((value: AvailabilityHourDto) => !value.isClosed && !value.isOffDay)
    @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: 'endTime must use HH:mm format',
    })
    endTime?: string;

    @IsOptional()
    @IsBoolean()
    isClosed?: boolean; // Is Closed is for business hours, not for staff working hours

    @IsOptional()
    @IsBoolean()
    isOffDay?: boolean;
}
