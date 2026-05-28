import { BaseEntity } from 'src/common/base.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Staff } from 'src/modules/staff/entities/staff.entity';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('staff_leaves')
@Index('IDX_STAFF_LEAVE_BUSINESS_ID', ['businessId'])
@Index('IDX_STAFF_LEAVE_STAFF_ID', ['staffId'])
@Index('IDX_STAFF_LEAVE_START_DATE', ['startDate'])
@Index('IDX_STAFF_LEAVE_END_DATE', ['endDate'])
export class StaffLeave extends BaseEntity {
    @Column({ type: 'bigint' })
    businessId: number;

    @ManyToOne(() => Business, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'businessId' })
    business: Business;

    @Column({ type: 'bigint' })
    staffId: number;

    @ManyToOne(() => Staff, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staffId' })
    staff: Staff;

    @Column({ type: 'date' })
    startDate: string;

    @Column({ type: 'date' })
    endDate: string;

    @Column({ type: 'varchar', length: 300, nullable: true })
    reason: string | null;

    @Column({ type: 'boolean', default: false })
    isApproved: boolean;

    @DeleteDateColumn({ type: 'timestamptz', nullable: true })
    deletedAt: Date | null;
}
