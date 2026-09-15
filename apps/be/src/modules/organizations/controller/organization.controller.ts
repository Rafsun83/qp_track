import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { CreateOrganizationDto } from '../dto/create-organization.dto.js';
import { OrganizationService } from '../service/organization.service.js';

@Controller('api')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post('/organizations')
  createOrganization(
    @Body() organizationData: CreateOrganizationDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.organizationService.createOrganization(
      req.user.sub,
      organizationData,
    );
  }

  @Get('/organizations')
  findAllOrganization() {
    return this.organizationService.findAll();
  }
}
