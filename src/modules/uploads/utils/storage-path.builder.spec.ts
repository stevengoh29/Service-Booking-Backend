import { BadRequestException } from '@nestjs/common';
import { UploadAssetType } from '../enums/upload-asset-type.enum';
import { StoragePathBuilder } from './storage-path.builder';

describe('StoragePathBuilder', () => {
  const builder = new StoragePathBuilder();
  const businessUuid = '3f24aab7-c3d1-4f5d-bad0-abc123abc123';
  const assetUuid = '9a1b94d2-2db3-4f8e-8d30-b16f8be7a111';

  it('roots business logo uploads under the business uuid', () => {
    expect(
      builder.generateStoragePath({
        businessUuid,
        assetType: UploadAssetType.BUSINESS_LOGO,
        fileName: 'logo.webp',
      }),
    ).toBe(`${businessUuid}/logo/logo.webp`);
  });

  it('uses the asset uuid for menu image filenames', () => {
    expect(
      builder.generateStoragePath({
        businessUuid,
        assetType: UploadAssetType.MENU_IMAGE,
        assetUuid,
        fileName: 'menu-item.webp',
      }),
    ).toBe(`${businessUuid}/menus/${assetUuid}.webp`);
  });

  it('rejects path traversal in filenames', () => {
    expect(() =>
      builder.generateStoragePath({
        businessUuid,
        assetType: UploadAssetType.BUSINESS_COVER,
        fileName: '../cover.webp',
      }),
    ).toThrow(BadRequestException);
  });

  it('requires asset uuid for gallery images', () => {
    expect(() =>
      builder.generateStoragePath({
        businessUuid,
        assetType: UploadAssetType.GALLERY_IMAGE,
        fileName: 'gallery.webp',
      }),
    ).toThrow(BadRequestException);
  });
});
