import { PartialType } from '@nestjs/mapped-types';
import { CreateBlockedTimeDto } from './create-blocked-time.dto';

export class UpdateBlockedTimeDto extends PartialType(CreateBlockedTimeDto) {}
