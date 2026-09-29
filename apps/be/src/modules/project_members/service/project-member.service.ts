import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditAction } from '../../logs/audit/enum/audit-action.enum.js';
import { AuditLogService } from '../../logs/audit/service/audit-log.service.js';
import {
  NotificationEvents,
  type ProjectMemberAddedEvent,
  type ProjectMemberRemovedEvent,
  type ProjectMemberRoleUpdatedEvent,
} from '../../notifications/events/notification.events.js';
import { ProjectMemberUpdateDto } from '../dto/project-member-update.dto.js';
import { ProjectMemberAddDto } from '../dto/project-member.dto.js';
import { ProjectMember } from '../entity/project-member.entity.js';
import { ProjectRole } from '../enum/project-role.enum.js';

@Injectable()
export class ProjectMemberService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly auditLogService: AuditLogService,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  async addProjectMember(
    projectId: string,
    { role, userId }: ProjectMemberAddDto,
    currentUserId: string,
  ) {
    if (role === ProjectRole.LEAD) {
      const existingLead = await this.projectMemberRepository.findOne({
        where: { projectId, role: ProjectRole.LEAD },
      });
      if (existingLead) {
        throw new ConflictException('Project already has a LEAD');
      }
    }

    const member = await this.dataSource.transaction(async (manager) => {
      const member = await manager.save(ProjectMember, {
        projectId,
        role,
        userId,
      });

      await this.auditLogService.record(manager, {
        actorId: currentUserId,
        action: AuditAction.PROJECT_MEMBER_ADDED,
        entityType: 'project_member',
        entityId: member.id,
        projectId,
        after: member,
      });

      return member;
    });

    this.eventEmitter.emit(NotificationEvents.PROJECT_MEMBER_ADDED, {
      actorId: currentUserId,
      projectId,
      userId,
      memberId: member.id,
      role: member.role,
    } satisfies ProjectMemberAddedEvent);

    return member;
  }

  async removeProjectMember(
    projectId: string,
    userId: string,
    currentUserId: string,
  ) {
    const requester = await this.projectMemberRepository.findOne({
      where: { projectId, userId: currentUserId },
    });

    if (requester?.role !== ProjectRole.LEAD) {
      throw new ForbiddenException(
        'Only the project LEAD can remove members!!',
      );
    }

    const removed = await this.dataSource.transaction(async (manager) => {
      const member = await manager.findOne(ProjectMember, {
        where: { projectId, userId },
      });
      if (!member) {
        throw new NotFoundException('Project member not found');
      }

      await manager.delete(ProjectMember, { projectId, userId });

      await this.auditLogService.record(manager, {
        actorId: currentUserId,
        action: AuditAction.PROJECT_MEMBER_REMOVED,
        entityType: 'project_member',
        entityId: member.id,
        projectId,
        before: member,
      });

      return member;
    });

    this.eventEmitter.emit(NotificationEvents.PROJECT_MEMBER_REMOVED, {
      actorId: currentUserId,
      projectId,
      userId,
      memberId: removed.id,
    } satisfies ProjectMemberRemovedEvent);
  }

  async updateProjectMemberRole(
    projectId: string,
    userId: string,
    { role }: ProjectMemberUpdateDto,
    currentUserId: string,
  ) {
    const { before, saved } = await this.dataSource.transaction(
      async (manager) => {
        const member = await manager.findOne(ProjectMember, {
          where: { projectId, userId },
        });

        if (!member) {
          throw new NotFoundException('Project member not found');
        }

        if (role === ProjectRole.LEAD && member.role !== ProjectRole.LEAD) {
          const existingLead = await manager.findOne(ProjectMember, {
            where: { projectId, role: ProjectRole.LEAD },
          });
          if (existingLead) {
            throw new ConflictException('Project already has a LEAD');
          }
        }

        const before = { ...member };
        member.role = role;
        const saved = await manager.save(member);

        await this.auditLogService.record(manager, {
          actorId: currentUserId,
          action: AuditAction.PROJECT_MEMBER_ROLE_UPDATED,
          entityType: 'project_member',
          entityId: member.id,
          projectId,
          before,
          after: saved,
        });

        return { before, saved };
      },
    );

    this.eventEmitter.emit(NotificationEvents.PROJECT_MEMBER_ROLE_UPDATED, {
      actorId: currentUserId,
      projectId,
      userId,
      memberId: saved.id,
      oldRole: before.role,
      newRole: saved.role,
    } satisfies ProjectMemberRoleUpdatedEvent);

    return saved;
  }
}
