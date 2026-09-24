import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { OrganizationMember } from '../../organization_members/entity/organization_member.entity.js';

const SALT_ROUNDS = 10;

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  loginCount: number;

  @Column()
  email: string;

  @OneToMany('OrganizationMember', (member: OrganizationMember) => member.user)
  memberships: OrganizationMember[];

  @Column()
  location: string;

  // The unique constraint below gives this column a plain B-tree index,
  // which only helps exact-match/prefix lookups. Username search
  // (UserService.findAll) does a both-sides ILIKE '%text%', so there's
  // also a pg_trgm GIN index on this column (see migration
  // AddUsernameTrigramIndex) - TypeORM's @Index() can't express the
  // gin_trgm_ops operator class, so it's not declared here as a decorator.
  @Column({ unique: true })
  @Index('IDX_users_userName_trgm', { synchronize: false })
  userName: string;

  @Column({ select: false })
  @Exclude()
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  }
}
