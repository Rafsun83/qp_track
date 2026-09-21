import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '../project_members/entity/project-member.entity.js';
import { SprintController } from './controller/sprint.controller.js';
import { Sprint } from './entity/sprint.entity.js';
import { SprintService } from './service/sprint.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Sprint, ProjectMember])],
  controllers: [SprintController],
  providers: [SprintService],
})
export class SprintModule {}
