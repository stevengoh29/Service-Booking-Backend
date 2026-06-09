import { BaseEntity } from 'src/common/base.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

@Entity('business_operating_hours')
@Unique(['businessId', 'dayOfWeek'])
@Index('IDX_BUSINESS_OPERATING_HOURS_BUSINESS_ID', ['businessId'])
@Index('IDX_BUSINESS_OPERATING_HOURS_DAY_OF_WEEK', ['dayOfWeek'])
export class BusinessOperatingHours extends BaseEntity {
  @Column({ type: 'bigint' })
  businessId: number;

  @ManyToOne(() => Business, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'int' })
  dayOfWeek: number;

  @Column({ type: 'varchar', length: 5, nullable: true })
  startTime: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  endTime: string | null;

  @Column({ type: 'boolean', default: false })
  isClosed: boolean;
}
