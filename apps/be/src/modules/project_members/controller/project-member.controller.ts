import { Body, Controller, Param, Post } from '@nestjs/common';
import { ProjectMemberAddDto } from '../dto/project-member.dto.js';
import { ProjectMemberService } from '../service/project-member.service.js';

@Controller('api')
export class ProjectMemberController {
  constructor(private readonly projectMemberService: ProjectMemberService) {}

  @Post('project/:projectId/member')
  addMemberInproject(
    @Param('projectId') projectId: string,
    @Body() projectMemberInfo: ProjectMemberAddDto,
  ) {
    return this.projectMemberService.addProjectMember(
      projectId,
      projectMemberInfo,
    );
  }
}
