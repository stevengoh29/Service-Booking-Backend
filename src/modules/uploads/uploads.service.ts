import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { extname, posix } from 'path';
import { SUPABASE_SERVICE_ROLE_CLIENT } from 'src/common/providers/supabase.provider';
import { User } from 'src/modules/users/entities/user.entity';
import { LessThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UPLOAD_ALLOWED_BUCKETS,
  UPLOAD_ALLOWED_EXTENSIONS,
  UPLOAD_ALLOWED_MIME_TYPES,
  UPLOAD_MAX_FILE_SIZE,
  UPLOAD_PENDING_CLEANUP_AGE_HOURS,
  UPLOAD_PRIVATE_BUCKET,
  UPLOAD_SIGNED_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
  UploadBucket,
} from './constants/upload.constants';
import { AttachUploadDto } from './dto/attach-upload.dto';
import { CreateSignedDownloadUrlDto } from './dto/create-signed-download-url.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { Upload } from './entities/upload.entity';
import { UploadStatus } from './enums/upload-status.enum';
import {
  AttachUploadResponse,
  DeleteFileResponse,
  SignedDownloadUrlResponse,
  UploadUrlResponse,
} from './interfaces/upload-url-response.interface';
import { StoragePathBuilder } from './utils/storage-path.builder';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    @Inject(SUPABASE_SERVICE_ROLE_CLIENT)
    private readonly supabase: SupabaseClient,
    @InjectRepository(Upload)
    private readonly uploadRepository: Repository<Upload>,
    private readonly storagePathBuilder: StoragePathBuilder,
  ) { }

  async createPresignedUploadUrl(
    user: User,
    dto: CreateUploadUrlDto,
  ): Promise<UploadUrlResponse> {
    this.validateBucket(dto.bucket);
    this.validateUploadFile(dto.fileName, dto.contentType, dto.fileSize);

    const businessUuid = user.business?.uuid;

    if (!businessUuid) {
      throw new ForbiddenException('User does not belong to a business');
    }

    const filePath = this.storagePathBuilder.generateStoragePath({
      businessUuid,
      assetType: dto.assetType,
      assetUuid: dto.assetUuid,
      fileName: dto.fileName,
    });
    const { data, error } = await this.supabase.storage
      .from(dto.bucket)
      .createSignedUploadUrl(filePath);

    if (error || !data?.signedUrl) {
      throw new InternalServerErrorException(
        error?.message || 'Failed to generate upload URL',
      );
    }

    const upload = await this.uploadRepository.save(
      this.uploadRepository.create({
        uploadedByUserId: user.id,
        bucket: dto.bucket,
        filePath,
        originalFileName: dto.fileName,
        mimeType: dto.contentType,
        fileSize: dto.fileSize,
        status: UploadStatus.PENDING,
        createdById: user.id,
        updatedById: user.id,
      }),
    );

    return {
      uploadUrl: data.signedUrl,
      uploadUuid: upload.uuid,
      filePath,
      bucket: dto.bucket,
    };
  }

  async attachUpload(
    uploadedByUserId: number,
    dto: AttachUploadDto,
  ): Promise<AttachUploadResponse> {
    const upload = await this.uploadRepository.findOne({
      where: { uuid: dto.uploadUuid },
    });

    if (!upload) {
      throw new NotFoundException('Upload not found');
    }

    if (Number(upload.uploadedByUserId) !== uploadedByUserId) {
      throw new ForbiddenException('Upload does not belong to current user');
    }

    if (upload.status !== UploadStatus.PENDING) {
      throw new BadRequestException('Upload is not pending');
    }

    upload.status = UploadStatus.ATTACHED;
    upload.entityType = dto.entityType;
    upload.entityUuid = dto.entityUuid;
    upload.updatedById = uploadedByUserId;

    const attachedUpload = await this.uploadRepository.save(upload);

    return {
      uploadUuid: attachedUpload.uuid,
      status: attachedUpload.status,
      entityType: attachedUpload.entityType!,
      entityUuid: attachedUpload.entityUuid!,
      bucket: attachedUpload.bucket,
      filePath: attachedUpload.filePath,
    };
  }

  async createSignedDownloadUrl(
    dto: CreateSignedDownloadUrlDto,
  ): Promise<SignedDownloadUrlResponse> {
    this.validateBucket(dto.bucket);
    this.validateFilePath(dto.filePath);

    if (dto.bucket !== UPLOAD_PRIVATE_BUCKET) {
      throw new ForbiddenException(
        'Signed download URLs are only available for private assets',
      );
    }

    const { data, error } = await this.supabase.storage
      .from(dto.bucket)
      .createSignedUrl(
        dto.filePath,
        UPLOAD_SIGNED_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
      );

    if (error) {
      if (this.isNotFoundError(error.message)) {
        throw new NotFoundException('File not found');
      }

      throw new InternalServerErrorException(
        error.message || 'Failed to generate signed download URL',
      );
    }

    if (!data?.signedUrl) {
      throw new NotFoundException('File not found');
    }

    return { url: data.signedUrl };
  }

  async deleteFile(
    dto: DeleteFileDto,
    uploadedByUserId?: number,
  ): Promise<DeleteFileResponse> {
    this.validateBucket(dto.bucket);
    this.validateFilePath(dto.filePath);

    const upload = await this.uploadRepository.findOne({
      where: {
        bucket: dto.bucket,
        filePath: dto.filePath,
      },
    });

    if (
      upload &&
      uploadedByUserId &&
      Number(upload.uploadedByUserId) !== uploadedByUserId
    ) {
      throw new ForbiddenException('Upload does not belong to current user');
    }

    const { error } = await this.supabase.storage
      .from(dto.bucket)
      .remove([dto.filePath]);

    if (error) {
      if (this.isNotFoundError(error.message)) {
        throw new NotFoundException('File not found');
      }

      throw new InternalServerErrorException(
        error.message || 'Failed to delete file',
      );
    }

    if (upload) {
      await this.uploadRepository.delete(upload.id);
    }

    return {
      deleted: true,
      bucket: dto.bucket,
      filePath: dto.filePath,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupPendingUploads(): Promise<{ deleted: number; failed: number }> {
    const cutoff = new Date(
      Date.now() - UPLOAD_PENDING_CLEANUP_AGE_HOURS * 60 * 60 * 1000,
    );
    const pendingUploads = await this.uploadRepository.find({
      where: {
        status: UploadStatus.PENDING,
        createdAt: LessThan(cutoff),
      },
    });

    let deleted = 0;
    let failed = 0;

    for (const upload of pendingUploads) {
      const { error } = await this.supabase.storage
        .from(upload.bucket)
        .remove([upload.filePath]);

      if (error) {
        failed += 1;
        this.logger.warn(
          `Failed to delete pending upload ${upload.uuid}: ${error.message}`,
        );
        continue;
      }

      await this.uploadRepository.delete(upload.id);
      deleted += 1;
    }

    if (deleted || failed) {
      this.logger.log(
        `Pending upload cleanup finished. deleted=${deleted}, failed=${failed}`,
      );
    }

    return { deleted, failed };
  }

  private validateUploadFile(
    fileName: string,
    contentType: string,
    fileSize?: number,
  ): void {
    if (!UPLOAD_ALLOWED_MIME_TYPES.includes(contentType as never)) {
      throw new BadRequestException('Unsupported file type');
    }

    const extension = this.getValidatedExtension(fileName);
    const expectedExtensions = this.getExpectedExtensions(contentType);

    if (!expectedExtensions.includes(extension)) {
      throw new BadRequestException(
        'File extension does not match content type',
      );
    }

    if (fileSize && fileSize > UPLOAD_MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds maximum allowed size');
    }
  }

  private validateBucket(bucket: string): asserts bucket is UploadBucket {
    if (!UPLOAD_ALLOWED_BUCKETS.includes(bucket as never)) {
      throw new ForbiddenException('Bucket not allowed');
    }
  }

  private validateFilePath(filePath: string): void {
    const normalizedPath = posix.normalize(filePath);

    if (
      normalizedPath !== filePath ||
      normalizedPath.startsWith('../') ||
      normalizedPath.includes('/../') ||
      normalizedPath.startsWith('/') ||
      filePath.includes('//')
    ) {
      throw new BadRequestException('Invalid file path');
    }
  }

  private getValidatedExtension(fileName: string): string {
    const extension = extname(fileName).replace('.', '').toLowerCase();

    if (!extension || !UPLOAD_ALLOWED_EXTENSIONS.includes(extension as never)) {
      throw new BadRequestException('Unsupported file type');
    }

    return extension;
  }

  private getExpectedExtensions(contentType: string): string[] {
    switch (contentType) {
      case 'image/png':
        return ['png'];
      case 'image/jpeg':
        return ['jpg', 'jpeg'];
      case 'image/webp':
        return ['webp'];
      default:
        return [];
    }
  }

  private isNotFoundError(message?: string): boolean {
    return /not found|does not exist/i.test(message || '');
  }
}
