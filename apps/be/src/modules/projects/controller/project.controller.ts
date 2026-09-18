import { Body, Controller, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorator/current-user.decorator.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { CurrentUserDto } from '../../auth/dto/current-user.dto.js';
import { OrganizationRole } from '../../organization_members/enum/organization-role.enum.js';
import { craeteProjectDto } from '../dto/project-create.dto.js';
import { ProjectService } from '../service/project.service.js';

@Controller('api')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

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
}
