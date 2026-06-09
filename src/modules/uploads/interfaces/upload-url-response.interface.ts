import { UploadBucket } from '../constants/upload.constants';

export interface UploadUrlResponse {
  uploadUrl: string;
  uploadUuid: string;
  filePath: string;
  bucket: UploadBucket;
}

export interface SignedDownloadUrlResponse {
  url: string;
}

export interface DeleteFileResponse {
  deleted: boolean;
  bucket: UploadBucket;
  filePath: string;
}

export interface AttachUploadResponse {
  uploadUuid: string;
  status: string;
  entityType: string;
  entityUuid: string;
  bucket: string;
  filePath: string;
}
