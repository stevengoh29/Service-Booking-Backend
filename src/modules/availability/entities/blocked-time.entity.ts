import { BaseEntity } from 'src/common/base.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('blocked_times')
@Index('IDX_BLOCKED_TIME_BUSINESS_ID', ['businessId'])
@Index('IDX_BLOCKED_TIME_START_DATE_TIME', ['startDateTime'])
@Index('IDX_BLOCKED_TIME_END_DATE_TIME', ['endDateTime'])
export class BlockedTime extends BaseEntity {
    @Column({ type: 'bigint' })
    businessId: number;

    @ManyToOne(() => Business, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'businessId' })
    business: Business;

    @Column({ type: 'timestamptz' })
    startDateTime: Date;

    @Column({ type: 'timestamptz' })
    endDateTime: Date;

    @Column({ type: 'varchar', length: 300, nullable: true })
    reason: string | null;

    @DeleteDateColumn({ type: 'timestamptz', nullable: true })
    deletedAt: Date | null;
}
