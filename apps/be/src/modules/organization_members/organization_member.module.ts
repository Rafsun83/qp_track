import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationMemberController } from './controller/organizationMember.controller.js';
import { OrganizationMember } from './entity/organization_member.entity.js';
import { OrganizationMemberService } from './service/organization_member.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMember])],
  controllers: [OrganizationMemberController],
  providers: [OrganizationMemberService],
  exports: [OrganizationMemberService],
})
export class OrganizationMembersModule {}
