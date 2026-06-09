import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  UPLOAD_ALLOWED_BUCKETS,
  UPLOAD_ALLOWED_MIME_TYPES,
  UPLOAD_MAX_FILE_SIZE,
} from '../constants/upload.constants';
import type {
  UploadAllowedMimeType,
  UploadBucket,
} from '../constants/upload.constants';
import { UploadAssetType } from '../enums/upload-asset-type.enum';

export class CreateUploadUrlDto {
  @IsIn(UPLOAD_ALLOWED_BUCKETS)
  bucket: UploadBucket;

  @IsEnum(UploadAssetType)
  assetType: UploadAssetType;

  @IsOptional()
  @IsUUID()
  assetUuid?: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsIn(UPLOAD_ALLOWED_MIME_TYPES)
  contentType: UploadAllowedMimeType;

  @IsInt()
  @Min(1)
  @Max(UPLOAD_MAX_FILE_SIZE)
  fileSize: number;
}
