export const UPLOAD_PUBLIC_BUCKET = 'business-assets';
export const UPLOAD_PRIVATE_BUCKET = 'private-assets';

export const UPLOAD_ALLOWED_BUCKETS = [
  UPLOAD_PUBLIC_BUCKET,
  UPLOAD_PRIVATE_BUCKET,
] as const;

export type UploadBucket = (typeof UPLOAD_ALLOWED_BUCKETS)[number];

export const UPLOAD_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type UploadAllowedMimeType = (typeof UPLOAD_ALLOWED_MIME_TYPES)[number];

export const UPLOAD_ALLOWED_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
] as const;

export const UPLOAD_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const UPLOAD_SIGNED_DOWNLOAD_URL_EXPIRES_IN_SECONDS = 5 * 60;
export const UPLOAD_PENDING_CLEANUP_AGE_HOURS = 24;

export const UPLOAD_ENTITY_TYPES = [
  'BUSINESS',
  'MENU_ITEM',
  'STAFF',
  'CUSTOMER',
] as const;

export type UploadEntityType = (typeof UPLOAD_ENTITY_TYPES)[number];
