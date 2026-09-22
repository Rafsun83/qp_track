import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { Roles } from '../../auth/decorator/roles.decorator.js';
import { OrganizationMemberCreateDto } from '../dto/organization-member-create-dto.js';
import { OrganizationMember } from '../entity/organization_member.entity.js';
import { OrganizationRole } from '../enum/organization-role.enum.js';
import { OrganizationMemberService } from '../service/organization_member.service.js';

@UseInterceptors(ResponseInterceptor)
@Controller('api')
export class OrganizationMemberController {
  constructor(
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  @ResponseMessage('Organization member added successfully')
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

  @ResponseMessage('Organization members fetched successfully')
  @Get('organizations/:organizationId/members')
  findOrganizationAllMembers(@Param('organizationId') organizationId: string) {
    return this.organizationMemberService.findAllMembers(organizationId);
  }

  @ResponseMessage('Organization member removed successfully')
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

  @ResponseMessage('Left organization successfully')
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
