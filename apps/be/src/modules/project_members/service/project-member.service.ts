import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMemberUpdateDto } from '../dto/project-member-update.dto.js';
import { ProjectMemberAddDto } from '../dto/project-member.dto.js';
import { ProjectMember } from '../entity/project-member.entity.js';

@Injectable()
export class ProjectMemberService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  addProjectMember(projectId: string, { role, userId }: ProjectMemberAddDto) {
    return this.projectMemberRepository.save({ projectId, role, userId });
  }

  async removeProjectMember(projectId: string, userId: string) {
    const result = await this.projectMemberRepository.delete({
      projectId,
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Project member not found');
    }
  }

  async updateProjectMemberRole(
    projectId: string,
    userId: string,
    { role }: ProjectMemberUpdateDto,
  ) {
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId },
    });

    if (!member) {
      throw new NotFoundException('Project member not found');
    }

    member.role = role;

    return this.projectMemberRepository.save(member);
  }
}
