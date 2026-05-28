import { BaseEntity } from 'src/common/base.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Staff } from 'src/modules/staff/entities/staff.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

@Entity('staff_working_hours')
@Unique(['businessId', 'staffId', 'dayOfWeek'])
@Index('IDX_STAFF_WORKING_HOURS_BUSINESS_ID', ['businessId'])
@Index('IDX_STAFF_WORKING_HOURS_STAFF_ID', ['staffId'])
@Index('IDX_STAFF_WORKING_HOURS_DAY_OF_WEEK', ['dayOfWeek'])
export class StaffWorkingHours extends BaseEntity {
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

    @Column({ type: 'int' })
    dayOfWeek: number;

    @Column({ type: 'varchar', length: 5, nullable: true })
    startTime: string | null;

    @Column({ type: 'varchar', length: 5, nullable: true })
    endTime: string | null;

    @Column({ type: 'boolean', default: false })
    isOffDay: boolean;
}
