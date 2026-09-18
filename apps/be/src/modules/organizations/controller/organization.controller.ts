import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Request,
} from '@nestjs/common';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { OrganizationRole } from '../../organization_members/enum/organization-role.enum.js';
import { CreateOrganizationDto } from '../dto/create-organization.dto.js';
import { UpdateOrganizationDto } from '../dto/update-organization.dto.js';
import { OrganizationService } from '../service/organization.service.js';

@Controller('api')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post('organizations')
  createOrganization(
    @Body() organizationData: CreateOrganizationDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.organizationService.createOrganization(
      req.user.sub,
      organizationData,
    );
  }

  @Get('organizations')
  findAllOrganization(@Request() req: { user: { sub: string } }) {
    return this.organizationService.findAll(req.user.sub);
  }

  @Get('organizations/:id')
  findOneOrganization(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Patch('organizations/:id')
  updateOrganization(
    @Param('id') id: string,
    @Body() organizationData: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(id, organizationData);
  }
}
