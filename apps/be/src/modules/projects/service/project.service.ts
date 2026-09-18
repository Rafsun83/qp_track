import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProjectMember } from '../../project_members/entity/project-member.entity.js';
import { craeteProjectDto } from '../dto/project-create.dto.js';
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
        // relations: { members: { project: true } },
      });
    });
  }
}
