import { BaseEntity } from 'src/common/base.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('customers')
@Index('IDX_CUSTOMER_BUSINESS_PHONE', ['businessId', 'phone'], { unique: true })
export class Customer extends BaseEntity {
  @Column({ type: 'bigint' })
  businessId: number;

  @ManyToOne(() => Business, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastVisitAt: Date | null;

  @Column({ type: 'int', default: 0 })
  totalReservations: number;
}
