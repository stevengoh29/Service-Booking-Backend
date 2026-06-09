import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateBlockedTimeDto {
  @IsOptional()
  @IsUUID()
  staffUuid?: string;

  @IsDateString()
  startDateTime: string;

  @IsDateString()
  endDateTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
