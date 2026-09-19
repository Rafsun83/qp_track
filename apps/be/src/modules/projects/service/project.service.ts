import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProjectMember } from '../../project_members/entity/project-member.entity.js';
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
}
