import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserDto } from '../../auth/dto/current-user.dto.js';
import { ProjectMember } from '../../project_members/entity/project-member.entity.js';
import { ProjectRole } from '../../project_members/enum/project-role.enum.js';
import { craeteProjectDto } from '../dto/project-create.dto.js';
import { UpdateProjectDto } from '../dto/project-update.dto.js';
import { Project } from '../entity/project.entity.js';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async createProject(
    userId: string,
    organizationId: string,
    projectInformation: craeteProjectDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const savedProject = await manager.save(Project, {
        ...projectInformation,
        createdBy: userId,
        organizationId,
      });

      await manager.save(ProjectMember, {
        projectId: savedProject.id,
        userId: userId,
      });

      return manager.findOneOrFail(Project, {
        where: { id: savedProject.id },
        relations: { members: { project: true } },
      });
    });
  }

  async getAllProjectsInOrganizations(organizationId: string) {
    return this.projectRepository.find({
      where: { organizationId: organizationId },
      relations: {
        members: {},
      },
    });
  }

  async getProjectByIdInOrganization(
    organizationId: string,
    projectId: string,
  ) {
    return this.projectRepository.findOne({
      where: { organizationId, id: projectId },
      relations: {
        members: {},
      },
    });
  }

  async updateIndividualProject(
    organizationId: string,
    id: string,
    data: UpdateProjectDto,
  ) {
    const project = await this.projectRepository.preload({
      organizationId,
      id,
      ...data,
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.projectRepository.save(project);
  }

  async deleteIndividualProject(
    organizationId: string,
    id: string,
    user: CurrentUserDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const memberRole = await manager.findOne(ProjectMember, {
        where: { projectId: id, userId: user.sub },
      });
      if (memberRole?.role !== ProjectRole.LEAD) {
        throw new ForbiddenException(
          'You do not have access to delete this project!!',
        );
      }

      await manager.delete(Project, { organizationId, id });
    });
  }
}
