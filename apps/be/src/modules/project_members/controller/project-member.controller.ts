import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { CurrentUser } from '../../auth/decorator/current-user.decorator.js';
import { CurrentUserDto } from '../../auth/dto/current-user.dto.js';
import { ProjectMemberUpdateDto } from '../dto/project-member-update.dto.js';
import { ProjectMemberAddDto } from '../dto/project-member.dto.js';
import { ProjectMemberService } from '../service/project-member.service.js';

@UseInterceptors(ResponseInterceptor)
@Controller('api')
export class ProjectMemberController {
  constructor(private readonly projectMemberService: ProjectMemberService) {}

  //   @Roles(OrganizationRole.OWNER) here who can add member, project LEAD can add member
  @ResponseMessage('Project member added successfully')
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

  @ResponseMessage('Project member removed successfully')
  @Delete('project/:projectId/member/:userId')
  removeMemberFromProject(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.projectMemberService.removeProjectMember(
      projectId,
      userId,
      currentUser.sub,
    );
  }

  //   @Roles(OrganizationRole.OWNER) here who can update member role, project LEAD can update member role
  @ResponseMessage('Project member role updated successfully')
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
