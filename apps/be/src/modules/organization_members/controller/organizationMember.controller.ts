import { Body, Controller, Post } from '@nestjs/common';
import { OrganizationMemberCreateDto } from '../dto/organization-member-create-dto.js';
import { OrganizationMemberService } from '../service/organization_member.service.js';

@Controller('api')
export class OrganizationMemberController {
  constructor(
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  @Post('/create-member')
  createOrganizationMember(
    @Body() organizationData: OrganizationMemberCreateDto,
  ) {
    return this.organizationMemberService.createOrganizationMember(
      organizationData,
    );
  }
}
