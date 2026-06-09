import { BaseEntity } from 'src/common/base.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { ReservationSource } from '../enums/reservation-source.enum';

@Entity('reservations')
@Index('IDX_RESERVATION_BUSINESS_ID', ['businessId'])
@Index('IDX_RESERVATION_BUSINESS_DATE', ['businessId', 'reservationDate'])
@Index('IDX_RESERVATION_BUSINESS_DATE_TIME', [
  'businessId',
  'reservationDate',
  'reservationTime',
])
@Index('IDX_RESERVATION_STATUS', ['status'])
@Index('IDX_RESERVATION_CUSTOMER_PHONE', ['customerPhone'])
@Index('IDX_RESERVATION_NUMBER', ['reservationNumber'], { unique: true })
export class Reservation extends BaseEntity {
  @Column({ type: 'bigint' })
  businessId: number;

  @ManyToOne(() => Business, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'varchar', length: 50, unique: true })
  reservationNumber: string;

  @Column({ type: 'bigint', nullable: true })
  customerId: number | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer | null;

  @Column({ type: 'varchar', length: 150 })
  customerName: string;

  @Column({ type: 'varchar', length: 30 })
  customerPhone: string;

  @Column({ type: 'date' })
  reservationDate: string;

  @Column({ type: 'time' })
  reservationTime: string;

  @Column({ type: 'int' })
  guestCount: number;

  @Column({ type: 'text', nullable: true })
  specialRequest: string | null;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({
    type: 'enum',
    enum: ReservationSource,
  })
  source: ReservationSource;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  noShowAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
