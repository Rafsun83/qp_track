import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Project } from '../../projects/entity/project.entity.js';
import { SprintPlanStatus } from '../enum/sprint.enum.js';

@Entity('sprint')
export class Sprint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @Index()
  projectId: string;

  @ManyToOne('Project', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  name: string;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: SprintPlanStatus,
    default: SprintPlanStatus.PLANNED,
  })
  status: SprintPlanStatus;
}
