import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Project } from '../../projects/entity/project.entity.js';
import type { Sprint } from '../../sprint/entity/sprint.entity.js';
import { TicketPriorityEnum } from '../enum/ticket-priority.enum.js';
import { TicketStatus } from '../enum/ticket-status.enum.js';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @ManyToOne('Project', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // Tickets are always created inside a sprint (no backlog concept), so
  // deleting a sprint cascades to its tickets.
  @Column({ name: 'sprint_id', type: 'uuid' })
  @Index()
  sprintId: string;

  @ManyToOne('Sprint', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.TODO,
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriorityEnum,
    default: TicketPriorityEnum.LOW,
  })
  priority: TicketPriorityEnum;

  @Column('jsonb', { nullable: true })
  metaData: Record<string, any> | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  // Who the ticket is assigned to - not always known at creation, so
  // nullable (an unassigned ticket).
  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  @Index()
  assigneeId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
