import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrganizationMember } from '../../organization_members/entity/organization_member.entity.js';
import { OrganizationRole } from '../../organization_members/enum/organization-role.enum.js';
import { CreateOrganizationDto } from '../dto/create-organization.dto.js';
import { SearchFilterOrganizationDto } from '../dto/search-filter-organization.dto.js';
import { UpdateOrganizationDto } from '../dto/update-organization.dto.js';
import { Organizations } from '../entity/organization.entity.js';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organizations)
    private readonly organizationRepository: Repository<Organizations>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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

      await manager.save(OrganizationMember, {
        organizationId: savedOrganization.id,
        userId: ownerId,
        role: OrganizationRole.OWNER,
      });

      // await this.organizationMemberService.createOrganizationMember({
      //   organizationId: savedOrganization.id,
      //   userId: ownerId,
      // });

      return manager.findOneOrFail(Organizations, {
        where: { id: savedOrganization.id },
        relations: { members: { user: true } },
      });
    });
  }

  async findAll(userId: string, query: SearchFilterOrganizationDto = {}) {
    // const { name } = query;
    // const orgQuery =
    //   this.organizationRepository.createQueryBuilder('organizations');

    // return this.organizationRepository.find({
    //   where: {
    //     // ownerId: userId,
    //     members: {
    //       user: {
    //         id: userId,
    //       },
    //     },
    //   },
    //   relations: {
    //     members: {},
    //   },
    // });

    const { name } = query;

    const qb = this.organizationRepository
      .createQueryBuilder('organizations')
      .innerJoin('organizations.members', 'members')
      .innerJoin('members.user', 'user')
      .where('user.id = :userId', { userId });

    if (name) {
      qb.andWhere('organizations.name ILIKE :name', { name: `${name}%` });
    }
    // Load full members relation for the response, without affecting the filter join above
    qb.leftJoinAndSelect('organizations.members', 'allMembers');

    return qb.getMany();
  }

  async findOne(id: string) {
    return this.organizationRepository.findOne({
      where: { id },
      relations: { members: { user: true } },
    });
  }

  async update(id: string, data: UpdateOrganizationDto) {
    const organization = await this.organizationRepository.preload({
      id,
      ...data,
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return this.organizationRepository.save(organization);
  }
}
