import { BaseEntity } from 'src/common/base.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    Unique,
} from 'typeorm';

import { Staff } from 'src/modules/staff/entities/staff.entity';
import { BusinessOnboardingStatus } from '../enums/business-onboarding-status.enum';
import { SubscriptionTier } from '../enums/subscription-tier.enum';
import { BusinessStaffSelectionMode } from '../enums/business-staff-selection-mode.enum';

@Entity('businesses')
@Unique(['slug'])
@Index('IDX_BUSINESS_OWNER_USER_ID', ['ownerUserId'])
@Index('IDX_BUSINESS_SLUG', ['slug'])
@Index('IDX_BUSINESS_IS_ACTIVE', ['isActive'])
// @Index('IDX_BUSINESS_NOTIFICATION_CHANNEL_STATUS', ['notificationChannelStatus'])
export class Business extends BaseEntity {
    /**
     * Core Ownership
     * Phase 1 = One owner user → one business
     * Future = expandable to multi-business ownership
     */
    @Column({ type: 'bigint' })
    ownerUserId: number;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'ownerUserId' })
    owner: User;

    /**
     * Public Brand Identity
     */
    @Column({ type: 'varchar', length: 150 })
    name: string;

    @Column({ type: 'varchar', length: 180 })
    slug: string;

    @Column({ type: 'text', nullable: true })
    logo: string | null;

    /**
     * Customer Contact Layer
     * Displayed publicly + included in BookOS notifications
     * NOT the sender infrastructure
     */
    @Column({ type: 'varchar', length: 30 })
    businessWhatsappNumber: string;

    @Column({ type: 'varchar', length: 30, nullable: true })
    contactPhone: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    contactEmail: string | null;

    /**
     * Location
     */
    @Column({ type: 'text', nullable: true })
    address: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    city: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    province: string | null;

    @Column({ type: 'varchar', length: 100, default: 'Indonesia' })
    country: string;

    /**
     * Localization
     */
    @Column({ type: 'varchar', length: 50, default: 'Asia/Jakarta' })
    timezone: string;

    @Column({ type: 'varchar', length: 10, default: 'id-ID' })
    locale: string;

    @Column({ type: 'varchar', length: 10, default: 'IDR' })
    currency: string;

    /**
     * Business Classification
     */
    @Column({ type: 'varchar', length: 100, nullable: true })
    businessCategory: string | null;

    /**
     * Operational Status
     */
    @Column({
        type: 'enum',
        enum: BusinessOnboardingStatus,
        default: BusinessOnboardingStatus.DRAFT,
    })
    onboardingStatus: BusinessOnboardingStatus;

    @Column({
        type: 'enum',
        enum: SubscriptionTier,
        default: SubscriptionTier.FREE,
    })
    subscriptionTier: SubscriptionTier;

    /**
     * Booking Behavior
     * Determines scheduling workflow
     */
    // @Column({
    //     type: 'enum',
    //     enum: BookingConfirmationMode,
    //     default: BookingConfirmationMode.MANUAL,
    // })
    // bookingConfirmationMode: BookingConfirmationMode;


    /**
     * Notification Infrastructure
     * Phase 1 = BookOS-owned WhatsApp only
     * Future = own WhatsApp / SMS / Email
     */
    // @Column({
    //     type: 'enum',
    //     enum: NotificationChannelType,
    //     default: NotificationChannelType.BOOKOS_WHATSAPP,
    // })
    // notificationChannelType: NotificationChannelType;

    // @Column({
    //     type: 'enum',
    //     enum: NotificationChannelStatus,
    //     default: NotificationChannelStatus.ACTIVE,
    // })
    // notificationChannelStatus: NotificationChannelStatus;

    /**
     * Payment Readiness
     * Not tied directly to provider implementation
     */
    // @Column({
    //     type: 'enum',
    //     enum: PaymentSetupStatus,
    //     default: PaymentSetupStatus.NOT_STARTED,
    // })
    // paymentSetupStatus: PaymentSetupStatus;

    /**
     * Domain & Activation
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    customDomain: string | null;

    @Column({ type: 'boolean', default: false })
    customDomainVerified: boolean;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'jsonb', default: () => "'{}'" })
    settings: Record<string, any>;

    @Column({ type: 'jsonb', default: () => "'{}'" })
    socialLinks: Record<string, any>;

    @Column({ type: 'jsonb', default: () => "'{}'" })
    seoMetadata: Record<string, any>;

    /**
     * Internal extensibility:
     * migration flags
     * onboarding metadata
     * source attribution
     * experiments
     */
    @Column({ type: 'jsonb', default: () => "'{}'" })
    metadata: Record<string, any>;

    // Staff
    @Column({
        type: 'enum',
        enum: BusinessStaffSelectionMode,
        default: BusinessStaffSelectionMode.NO_SELECTION,
    })
    staffSelectionMode: BusinessStaffSelectionMode;

    @OneToMany(() => Staff, (staff) => staff.business)
    staff: Staff[];
}