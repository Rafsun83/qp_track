import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  prefix: string;

  @Column()
  @Exclude()
  hashedKey: string;

  @Column({ nullable: true })
  label: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  lastUpdatedAt: Date;

  @Column({ nullable: true })
  revokedAt: Date;
}
