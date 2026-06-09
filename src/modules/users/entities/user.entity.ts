import { BaseEntity } from 'src/common/base.entity';
import { Column, Entity } from 'typeorm';

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
}
