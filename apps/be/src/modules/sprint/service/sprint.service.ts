import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../../project_members/entity/project-member.entity.js';
import { ProjectRole } from '../../project_members/enum/project-role.enum.js';
import { CreateSprintDto } from '../dto/sprint-create.dto.js';
import { UpdateSprintDto } from '../dto/sprint-update.dto.js';
import { Sprint } from '../entity/sprint.entity.js';

// LEAD and CONTRIBUTOR plan/manage sprints; VIEWER is read-only.
const SPRINT_MANAGE_ROLES = [ProjectRole.LEAD, ProjectRole.CONTRIBUTOR];

@Injectable()
export class SprintService {
  constructor(
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  private async requireMembership(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember> {
    const membership = await this.projectMemberRepository.findOne({
      where: { projectId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this project');
    }
    return membership;
  }

  private assertManageableDateRange(
    startDate: Date | string,
    endDate: Date | string,
  ) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate must be before endDate');
    }
  }

  async createSprint(
    projectId: string,
    currentUserId: string,
    data: CreateSprintDto,
  ) {
    const membership = await this.requireMembership(projectId, currentUserId);
    if (!SPRINT_MANAGE_ROLES.includes(membership.role)) {
      throw new ForbiddenException(
        'Only the project LEAD or CONTRIBUTOR can create sprints',
      );
    }
    this.assertManageableDateRange(data.startDate, data.endDate);

    return this.sprintRepository.save({ ...data, projectId });
  }

  async getSprintsForProject(projectId: string, currentUserId: string) {
    await this.requireMembership(projectId, currentUserId);
    return this.sprintRepository.find({ where: { projectId } });
  }

  async getSprintById(
    projectId: string,
    sprintId: string,
    currentUserId: string,
  ) {
    await this.requireMembership(projectId, currentUserId);

    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId, projectId },
    });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
    return sprint;
  }

  async updateSprint(
    projectId: string,
    sprintId: string,
    currentUserId: string,
    data: UpdateSprintDto,
  ) {
    const membership = await this.requireMembership(projectId, currentUserId);
    if (!SPRINT_MANAGE_ROLES.includes(membership.role)) {
      throw new ForbiddenException(
        'Only the project LEAD or CONTRIBUTOR can update sprints',
      );
    }

    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId, projectId },
    });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    Object.assign(sprint, data);
    this.assertManageableDateRange(sprint.startDate, sprint.endDate);

    return this.sprintRepository.save(sprint);
  }

  async deleteSprint(
    projectId: string,
    sprintId: string,
    currentUserId: string,
  ) {
    const membership = await this.requireMembership(projectId, currentUserId);
    if (membership.role !== ProjectRole.LEAD) {
      throw new ForbiddenException('Only the project LEAD can delete sprints');
    }

    const result = await this.sprintRepository.delete({
      id: sprintId,
      projectId,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Sprint not found');
    }
  }
}
