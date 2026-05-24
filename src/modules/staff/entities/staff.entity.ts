import { BaseEntity } from 'src/common/base.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    Unique,
} from 'typeorm';
import { StaffRole } from '../enums/staff-role.enum';

@Entity('staff')
@Unique(['businessId', 'slug'])
export class Staff extends BaseEntity {
    @Index()
    @Column()
    businessId: number;

    @ManyToOne(() => Business, (business) => business.staff, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'businessId' })
    business: Business;

    @Column({ length: 120 })
    name: string;

    @Column({ unique: false })
    slug: string;

    @Column({ nullable: true })
    photoUrl?: string;

    @Column({
        type: 'enum',
        enum: StaffRole,
        default: StaffRole.STAFF,
    })
    role: StaffRole;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    whatsappNumber?: string;

    @Column({ type: 'text', nullable: true })
    bio?: string;

    @Column({
        type: 'jsonb',
        default: {},
    })
    weeklySchedule: Record<string, any>;
    /**
     * Example:
     * {
     *   monday: { enabled: true, start: "09:00", end: "18:00" },
     *   tuesday: ...
     * }
     */

    @Column({
        type: 'jsonb',
        default: [],
    })
    blockedDates: string[];
    /**
     * Example:
     * ["2026-12-25", "2026-12-31"]
     */

    @Column({
        default: true,
    })
    isActive: boolean;

    @Column({
        type: 'int',
        default: 0,
    })
    bufferMinutes: number;

    @Column({
        type: 'jsonb',
        default: {},
    })
    metadata: Record<string, any>;
}