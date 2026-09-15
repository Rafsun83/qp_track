import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrganizationMemberService } from '../../organization_members/service/organization_member.service.js';
import { CreateOrganizationDto } from '../dto/create-organization.dto.js';
import { Organizations } from '../entity/organization.entity.js';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organizations)
    private readonly organizationRepository: Repository<Organizations>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  async createOrganization(
    ownerId: string,
    organization: CreateOrganizationDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const savedOrganization = await manager.save(Organizations, {
        ownerId,
        name: organization.name,
      });

      await this.organizationMemberService.createOrganizationMember({
        organizationId: savedOrganization.id,
        userId: ownerId,
      });

      return manager.findOneOrFail(Organizations, {
        where: { id: savedOrganization.id },
        relations: { members: { user: true } },
      });
    });
  }

  async findAll() {
    return this.organizationRepository.find({
      relations: { members: { user: true, organization: true }, owner: {} },
    });
  }
}
