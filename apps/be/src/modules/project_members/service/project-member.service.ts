import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMemberUpdateDto } from '../dto/project-member-update.dto.js';
import { ProjectMemberAddDto } from '../dto/project-member.dto.js';
import { ProjectMember } from '../entity/project-member.entity.js';
import { ProjectRole } from '../enum/project-role.enum.js';

@Injectable()
export class ProjectMemberService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  async addProjectMember(
    projectId: string,
    { role, userId }: ProjectMemberAddDto,
  ) {
    if (role === ProjectRole.LEAD) {
      const existingLead = await this.projectMemberRepository.findOne({
        where: { projectId, role: ProjectRole.LEAD },
      });
      if (existingLead) {
        throw new ConflictException('Project already has a LEAD');
      }
    }

    return this.projectMemberRepository.save({ projectId, role, userId });
  }

  async removeProjectMember(
    projectId: string,
    userId: string,
    currentUserId: string,
  ) {
    const requester = await this.projectMemberRepository.findOne({
      where: { projectId, userId: currentUserId },
    });

    if (requester?.role !== ProjectRole.LEAD) {
      throw new ForbiddenException(
        'Only the project LEAD can remove members!!',
      );
    }

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

    if (role === ProjectRole.LEAD && member.role !== ProjectRole.LEAD) {
      const existingLead = await this.projectMemberRepository.findOne({
        where: { projectId, role: ProjectRole.LEAD },
      });
      if (existingLead) {
        throw new ConflictException('Project already has a LEAD');
      }
    }

    member.role = role;

    return this.projectMemberRepository.save(member);
  }
}
