import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationEvents,
  type OrganizationMemberAddedEvent,
} from '../../notifications/events/notification.events.js';
import { OrganizationMemberCreateDto } from '../dto/organization-member-create-dto.js';
import { OrganizationMember } from '../entity/organization_member.entity.js';
import { OrganizationRole } from '../enum/organization-role.enum.js';

@Injectable()
export class OrganizationMemberService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createOrganizationMember(
    organizationId: string,
    { userId, role }: OrganizationMemberCreateDto,
    actorId: string,
  ) {
    const alreadyMember = await this.organizationMemberRepository.findOne({
      where: { organizationId, userId },
    });
    if (alreadyMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    const member = await this.organizationMemberRepository.save({
      organizationId,
      userId,
      role,
    });

    this.eventEmitter.emit(NotificationEvents.ORGANIZATION_MEMBER_ADDED, {
      actorId,
      organizationId,
      userId,
      memberId: member.id,
      role: member.role,
    } satisfies OrganizationMemberAddedEvent);

    return member;
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
      throw new ForbiddenException('You can not delete yourself');
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

  async leaveMemberFromOrganization(
    organizationId: string,
    userId: string,
    actorMembership: OrganizationMember,
  ) {
    if (
      actorMembership.userId !== userId &&
      actorMembership.role === OrganizationRole.MEMBER
    ) {
      throw new ForbiddenException(
        "You can't happening this action as member.",
      );
    }
    const leave = await this.organizationMemberRepository.delete({
      organizationId,
      userId,
    });
    if (!leave.affected) {
      throw new NotFoundException('Member not found in this organization');
    }
    return leave;
  }
}
