import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationMembersModule } from '../organization_members/organization_member.module.js';
import { OrganizationController } from './controller/organization.controller.js';
import { Organizations } from './entity/organization.entity.js';
import { OrganizationService } from './service/organization.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organizations]),
    OrganizationMembersModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
})
export class OrganizationsModule {}
