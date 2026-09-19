import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { ProjectMemberUpdateDto } from '../dto/project-member-update.dto.js';
import { ProjectMemberAddDto } from '../dto/project-member.dto.js';
import { ProjectMemberService } from '../service/project-member.service.js';

@Controller('api')
export class ProjectMemberController {
  constructor(private readonly projectMemberService: ProjectMemberService) {}

  //   @Roles(OrganizationRole.OWNER) here who can add member, project LEAD can add member
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

  //   @Roles(OrganizationRole.OWNER) here who can remove member, project LEAD can remove member
  @Delete('project/:projectId/member/:userId')
  removeMemberFromProject(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.projectMemberService.removeProjectMember(projectId, userId);
  }

  //   @Roles(OrganizationRole.OWNER) here who can update member role, project LEAD can update member role
  @Patch('project/:projectId/member/:userId')
  updateMemberRoleInProject(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() data: ProjectMemberUpdateDto,
  ) {
    return this.projectMemberService.updateProjectMemberRole(
      projectId,
      userId,
      data,
    );
  }
}
