import { BaseEntity } from 'src/common/base.entity';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { Column, Entity, OneToOne } from 'typeorm';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ default: false })
  onboardingCompleted: boolean;

  @Column({ nullable: true, unique: true })
  supabaseId: string;

  @OneToOne(() => Business, (business) => business.owner)
  business: Business | null;
}
