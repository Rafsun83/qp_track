import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { CurrentUser } from '../../auth/decorator/current-user.decorator.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { CurrentUserDto } from '../../auth/dto/current-user.dto.js';
import { OrganizationRole } from '../../organization_members/enum/organization-role.enum.js';
import { craeteProjectDto } from '../dto/project-create.dto.js';
import { UpdateProjectDto } from '../dto/project-update.dto.js';
import { ProjectService } from '../service/project.service.js';

@UseInterceptors(ResponseInterceptor)
@Controller('api')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @ResponseMessage('Project created successfully')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Post('organization/:organizationId/project')
  createProject(
    @Body() projectInformation: craeteProjectDto,
    @Param('organizationId') organizationId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.projectService.createProject(
      currentUser.sub,
      organizationId,
      projectInformation,
    );
  }

  // @Roles(OrganizationRole.OWNER)
  @ResponseMessage('Projects fetched successfully')
  @Get('organization/:organizationId/project')
  getAllProjectInOrganization(
    @Param('organizationId') organizationId: string,
    @CurrentUser() currentuser: CurrentUserDto,
  ) {
    return this.projectService.getAllProjectsInOrganizations(
      organizationId,
      currentuser,
    );
  }

  @ResponseMessage('Project fetched successfully')
  @Get('organization/:organizationId/project/:id')
  getProjectByIdOrganization(
    @Param('organizationId') organizationId: string,
    @Param('id') projectId: string,
  ) {
    return this.projectService.getProjectByIdInOrganization(
      organizationId,
      projectId,
    );
  }

  @ResponseMessage('Project updated successfully')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Patch('organization/:organizationId/project/:id')
  updateProject(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() data: UpdateProjectDto,
  ) {
    return this.projectService.updateIndividualProject(
      organizationId,
      id,
      data,
    );
  }

  @ResponseMessage('Project deleted successfully')
  @Roles(OrganizationRole.OWNER)
  @Delete('organization/:organizationId/project/:id')
  deleteProject(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.projectService.deleteIndividualProject(
      organizationId,
      id,
      user,
    );
  }
}
