import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async createOrganizationMember(
    organizationId: string,
    { userId, role }: OrganizationMemberCreateDto,
  ) {
    const alreadyMember = await this.organizationMemberRepository.findOne({
      where: { organizationId, userId },
    });
    if (alreadyMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    return this.organizationMemberRepository.save({
      organizationId,
      userId,
      role,
    });
  }

  async findMembership(organizationId: string, userId: string) {
    return this.organizationMemberRepository.findOne({
      where: { organizationId, userId },
    });
  }

  async findAllMembers(organizationId: string) {
    return this.organizationMemberRepository.find({
      where: { organizationId },
      relations: { user: true },
    });
  }

  async deleteMember(
    organizationId: string,
    actorMembership: OrganizationMember,
    userId: string,
  ) {
    if (actorMembership.userId === userId) {
      throw new ForbiddenException('Owner can not delete himself');
    }

    const result = await this.organizationMemberRepository.delete({
      organizationId,
      userId,
    });
    if (!result.affected) {
      throw new NotFoundException('Member not found in this organization');
    }
    return result;
  }
}
