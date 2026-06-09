import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AvailabilityHourDto } from './availability-hour.dto';

export class UpdateBusinessOperatingHoursDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityHourDto)
  hours: AvailabilityHourDto[];
}
