import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
