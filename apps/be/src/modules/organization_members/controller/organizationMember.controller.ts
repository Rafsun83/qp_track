import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { OrganizationMemberCreateDto } from '../dto/organization-member-create-dto.js';
import { OrganizationMemberService } from '../service/organization_member.service.js';

@Controller('api')
export class OrganizationMemberController {
  constructor(
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  @Post('organizations/:id/members')
  createOrganizationMember(
    @Param('id') id: string,
    @Body() organizationData: OrganizationMemberCreateDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.organizationMemberService.createOrganizationMember(
      id,
      req.user.sub,
      organizationData,
    );
  }

  @Get('organizations/:id/members')
  findOrganizationAllMembers(@Param('id') id: string) {
    return this.organizationMemberService.findAllMembers(id);
  }

  @Delete('organizations/:id/members/:userId')
  deletOrganizationMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.organizationMemberService.deleteMember(
      id,
      req.user.sub,
      userId,
    );
  }
}
