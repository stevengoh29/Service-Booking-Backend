// src/modules/businesses/dto/update-business.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateBusinessDto } from './create-business.dto';

export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {}