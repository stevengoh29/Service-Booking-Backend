import { BaseEntity } from 'src/common/base.entity';
import { Column, Entity, Index } from 'typeorm';
import { UploadStatus } from '../enums/upload-status.enum';

@Entity('uploads')
@Index('IDX_UPLOAD_UPLOADED_BY_USER_ID', ['uploadedByUserId'])
@Index('IDX_UPLOAD_STATUS_CREATED_AT', ['status', 'createdAt'])
@Index('IDX_UPLOAD_BUCKET_FILE_PATH', ['bucket', 'filePath'])
@Index('IDX_UPLOAD_ENTITY', ['entityType', 'entityUuid'])
export class Upload extends BaseEntity {
  @Column({ type: 'bigint' })
  uploadedByUserId: number;

  @Column({ type: 'varchar', length: 100 })
  bucket: string;

  @Column({ type: 'text' })
  filePath: string;

  @Column({ type: 'varchar', length: 255 })
  originalFileName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  fileSize: number;

  @Column({
    type: 'enum',
    enum: UploadStatus,
    default: UploadStatus.PENDING,
  })
  status: UploadStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entityType: string | null;

  @Column({ type: 'uuid', nullable: true })
  entityUuid: string | null;
}
