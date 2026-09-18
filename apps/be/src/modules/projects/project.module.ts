import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '../project_members/entity/project-member.entity.js';
import { ProjectController } from './controller/project.controller.js';
import { Project } from './entity/project.entity.js';
import { ProjectService } from './service/project.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), ProjectMember],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
