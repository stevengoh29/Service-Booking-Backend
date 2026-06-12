import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname, posix } from 'path';
import { UploadAssetType } from '../enums/upload-asset-type.enum';

export interface GenerateStoragePathInput {
  businessUuid: string;
  assetType: UploadAssetType;
  fileName: string;
  assetUuid?: string;
}

@Injectable()
export class StoragePathBuilder {
  generateStoragePath(input: GenerateStoragePathInput): string {
    const businessUuid = this.validateUuid(input.businessUuid, 'businessUuid');
    const extension = this.getSafeExtension(input.fileName);

    switch (input.assetType) {
      case UploadAssetType.BUSINESS_LOGO:
        return posix.join(businessUuid, 'logo', `${randomUUID()}.${extension}`);
      case UploadAssetType.BUSINESS_COVER:
        return posix.join(
          businessUuid,
          'cover',
          `${randomUUID()}.${extension}`,
        );
      case UploadAssetType.MENU_IMAGE:
        return posix.join(
          businessUuid,
          'menus',
          `${this.validateUuid(input.assetUuid, 'assetUuid')}.${extension}`,
        );
      case UploadAssetType.GALLERY_IMAGE:
        return posix.join(
          businessUuid,
          'gallery',
          `${this.validateUuid(input.assetUuid, 'assetUuid')}.${extension}`,
        );
      default:
        throw new BadRequestException('Unsupported upload asset type');
    }
  }

  private getSafeExtension(fileName: string): string {
    const safeFileName = posix.basename(fileName);

    if (!safeFileName || safeFileName !== fileName || fileName.includes('..')) {
      throw new BadRequestException('Invalid file name');
    }

    const extension = extname(safeFileName).replace('.', '').toLowerCase();

    if (!extension || !/^[a-z0-9]+$/.test(extension)) {
      throw new BadRequestException('Invalid file extension');
    }

    return extension;
  }

  private validateUuid(value: string | undefined, fieldName: string): string {
    if (
      !value ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }

    return value;
  }
}
