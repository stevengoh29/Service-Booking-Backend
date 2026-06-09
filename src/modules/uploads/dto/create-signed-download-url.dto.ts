import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';
import {
  UPLOAD_ALLOWED_BUCKETS,
} from '../constants/upload.constants';
import type { UploadBucket } from '../constants/upload.constants';

export class CreateSignedDownloadUrlDto {
  @IsIn(UPLOAD_ALLOWED_BUCKETS)
  bucket: UploadBucket;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9/._-]*$/, {
    message: 'File path must contain only letters, numbers, slashes, dots, underscores, or dashes',
  })
  filePath: string;
}
