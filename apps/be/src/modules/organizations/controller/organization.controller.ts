import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Request,
} from '@nestjs/common';
import { CreateOrganizationDto } from '../dto/create-organization.dto.js';
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
}
