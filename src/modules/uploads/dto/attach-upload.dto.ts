import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { UPLOAD_ENTITY_TYPES } from '../constants/upload.constants';
import type { UploadEntityType } from '../constants/upload.constants';

export class AttachUploadDto {
  @IsUUID()
  uploadUuid: string;

  @IsIn(UPLOAD_ENTITY_TYPES)
  entityType: UploadEntityType;

  @IsUUID()
  @IsNotEmpty()
  @IsString()
  entityUuid: string;
}
