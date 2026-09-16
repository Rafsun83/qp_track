import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { OrganizationMemberCreateDto } from '../dto/organization-member-create-dto.js';
import { OrganizationMember } from '../entity/organization_member.entity.js';
import { OrganizationRole } from '../enum/organization-role.enum.js';
import { OrganizationMemberService } from '../service/organization_member.service.js';

@Controller('api')
export class OrganizationMemberController {
  constructor(
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Post('organizations/:id/members')
  createOrganizationMember(
    @Param('id') id: string,
    @Body() organizationData: OrganizationMemberCreateDto,
  ) {
    return this.organizationMemberService.createOrganizationMember(
      id,
      organizationData,
    );
  }

  @Get('organizations/:id/members')
  findOrganizationAllMembers(@Param('id') id: string) {
    return this.organizationMemberService.findAllMembers(id);
  }

  @Roles(OrganizationRole.OWNER)
  // @HttpCode(HttpStatus.OK)
  @Delete('organizations/:id/members/:userId')
  deletOrganizationMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: Request & { organizationMember: OrganizationMember },
  ) {
    return this.organizationMemberService.deleteMember(
      id,
      req.organizationMember,
      userId,
    );
  }
}
