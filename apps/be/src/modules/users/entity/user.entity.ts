import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
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

  @OneToMany(
    'OrganizationMember',
    (member: OrganizationMember) => member.user,
  )
  memberships: OrganizationMember[];

  @Column()
  location: string;

  @Column({ unique: true })
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
