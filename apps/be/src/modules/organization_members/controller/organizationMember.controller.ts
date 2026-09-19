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
  @Post('organizations/:organizationId/members')
  createOrganizationMember(
    @Param('organizationId') organizationId: string,
    @Body() organizationData: OrganizationMemberCreateDto,
  ) {
    return this.organizationMemberService.createOrganizationMember(
      organizationId,
      organizationData,
    );
  }

  @Get('organizations/:organizationId/members')
  findOrganizationAllMembers(@Param('organizationId') organizationId: string) {
    return this.organizationMemberService.findAllMembers(organizationId);
  }

  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @Delete('organizations/:organizationId/members/:userId')
  deletOrganizationMember(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Req() req: Request & { organizationMember: OrganizationMember },
  ) {
    return this.organizationMemberService.deleteMember(
      organizationId,
      req.organizationMember,
      userId,
    );
  }

  @Roles(OrganizationRole.ADMIN, OrganizationRole.MEMBER)
  @Delete('organizations/:organizationId/members/:userId/leave')
  leaveFromOrganization(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Req() req: Request & { organizationMember: OrganizationMember },
  ) {
    return this.organizationMemberService.leaveMemberFromOrganization(
      organizationId,
      userId,
      req.organizationMember,
    );
  }
}
