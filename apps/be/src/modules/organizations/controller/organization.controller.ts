import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { OrganizationRole } from '../../organization_members/enum/organization-role.enum.js';
import { CreateOrganizationDto } from '../dto/create-organization.dto.js';
import { SearchFilterOrganizationDto } from '../dto/search-filter-organization.dto.js';
import { UpdateOrganizationDto } from '../dto/update-organization.dto.js';
import { OrganizationService } from '../service/organization.service.js';

@UseInterceptors(ResponseInterceptor)
@Controller('api')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @ResponseMessage('Organization created successfully')
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

  @ResponseMessage('Organizations fetched successfully')
  @Get('organizations')
  findAllOrganization(
    @Request() req: { user: { sub: string } },
    @Query() query: SearchFilterOrganizationDto,
  ) {
    return this.organizationService.findAll(req.user.sub, query);
  }

  @ResponseMessage('Organization fetched successfully')
  @Get('organizations/:organizationId')
  findOneOrganization(@Param('organizationId') organizationId: string) {
    return this.organizationService.findOne(organizationId);
  }

  @ResponseMessage('Organization updated successfully')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Patch('organizations/:organizationId')
  updateOrganization(
    @Param('organizationId') organizationId: string,
    @Body() organizationData: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(organizationId, organizationData);
  }
}
