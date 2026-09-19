import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entity/project.entity.js';
import { ProjectMemberController } from './controller/project-member.controller.js';
import { ProjectMember } from './entity/project-member.entity.js';
import { ProjectMemberService } from './service/project-member.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectMember, Project])],
  controllers: [ProjectMemberController],
  providers: [ProjectMemberService],
})
export class ProjectMemberModule {}
