import { BaseEntity } from 'src/common/base.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Staff } from 'src/modules/staff/entities/staff.entity';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('blocked_times')
@Index('IDX_BLOCKED_TIME_BUSINESS_ID', ['businessId'])
@Index('IDX_BLOCKED_TIME_STAFF_ID', ['staffId'])
@Index('IDX_BLOCKED_TIME_START_DATE_TIME', ['startDateTime'])
@Index('IDX_BLOCKED_TIME_END_DATE_TIME', ['endDateTime'])
export class BlockedTime extends BaseEntity {
    @Column({ type: 'bigint' })
    businessId: number;

    @ManyToOne(() => Business, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'businessId' })
    business: Business;

    /**
     * NULL = business-wide blocked time
     * non-NULL = staff-specific blocked time
     */
    @Column({ type: 'bigint', nullable: true })
    staffId: number | null;

    @ManyToOne(() => Staff, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staffId' })
    staff: Staff | null;

    @Column({ type: 'timestamptz' })
    startDateTime: Date;

    @Column({ type: 'timestamptz' })
    endDateTime: Date;

    @Column({ type: 'varchar', length: 300, nullable: true })
    reason: string | null;

    @DeleteDateColumn({ type: 'timestamptz', nullable: true })
    deletedAt: Date | null;
}
