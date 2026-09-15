import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMemberCreateDto } from '../dto/organization-member-create-dto.js';
import { OrganizationMember } from '../entity/organization_member.entity.js';

@Injectable()
export class OrganizationMemberService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
  ) {}

  createOrganizationMember(createOrganization: OrganizationMemberCreateDto) {
    return this.organizationMemberRepository.save(createOrganization);
  }
}
