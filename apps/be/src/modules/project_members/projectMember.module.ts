import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from './entity/project-member.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectMember])],
  controllers: [],
  providers: [],
})
export class ProjectMemberModule {}
