import { BaseEntity } from 'src/common/base.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
    Column,
    DeleteDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    Unique,
} from 'typeorm';
import { StaffRole } from '../enums/staff-role.enum';
import { Exclude } from 'class-transformer';

@Entity('staff')
@Unique(['businessId', 'slug'])
@Unique(['businessId', 'userId'])
export class Staff extends BaseEntity {
    @Index()
    @Column()
    @Exclude()
    businessId: number;

    @ManyToOne(() => Business, (business) => business.staff, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'businessId' })
    business: Business;

    @Index()
    @Column({ type: 'bigint', nullable: true })
    @Exclude()
    userId: number | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ length: 120 })
    displayName: string;

    @Column({ length: 255 })
    email: string;

    @Column({ unique: false })
    slug: string;

    @Column({ nullable: true })
    profileImageUrl?: string;

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

    @Column({ type: 'timestamptz' })
    joinedAt: Date;

    @Column({
        default: true,
    })
    isActive: boolean;

    @Column({
        type: 'int',
        default: 0,
    })
    bufferMinutes: number;

    @DeleteDateColumn({ type: 'timestamptz', nullable: true })
    deletedAt: Date | null;
}
