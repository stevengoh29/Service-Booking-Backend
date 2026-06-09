// src/common/entities/base.entity.ts
import { Exclude, Expose } from 'class-transformer';
import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number; // internal DB key — never exposed in API

  @Column({
    type: 'uuid',
    unique: true,
    default: () => 'gen_random_uuid()', // PostgreSQL generates it natively
  })
  @Expose()
  uuid: string;

  @Column({ type: 'int', nullable: true })
  @Exclude()
  createdById: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdByName: string | null; // snapshot of name at time of creation

  @Column({ type: 'int', nullable: true })
  @Exclude()
  @Exclude()
  updatedById: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  updatedByName: string | null; // snapshot of name at time of update

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
