import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { User } from '../../users/entity/user.entity.js';
import { NotificationType } from '../enum/notification-type.enum.js';

@Entity('notifications')
@Index('IDX_notifications_recipient', ['recipientId', 'createdAt'])
// Partial index: unread counts only ever scan the (small) unread slice.
@Index('IDX_notifications_recipient_unread', ['recipientId'], {
  where: '"read_at" IS NULL',
})
export class Notification {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_notifications_id',
  })
  id: string;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'recipient_id',
    foreignKeyConstraintName: 'FK_notifications_recipient',
  })
  recipient?: User;

  // Null when the change wasn't made by a user (e.g. system / webhook).
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  // Extra ids the client needs to deep-link (e.g. sprintId for a ticket URL).
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
