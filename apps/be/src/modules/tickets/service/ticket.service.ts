import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../../project_members/entity/project-member.entity.js';
import { ProjectRole } from '../../project_members/enum/project-role.enum.js';
import { Sprint } from '../../sprint/entity/sprint.entity.js';
import { CreateTicketDto } from '../dto/ticket-create.dto.js';
import { UpdateTicketDto } from '../dto/ticket-update.dto.js';
import { Ticket } from '../entity/ticket.entity.js';

// LEAD and CONTRIBUTOR create/edit/delete tickets; VIEWER is read-only.
const TICKET_MANAGE_ROLES = [ProjectRole.LEAD, ProjectRole.CONTRIBUTOR];

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,

    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
  ) {}

  private async requireMembership(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember> {
    const membership = await this.projectMemberRepository.findOne({
      where: { projectId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this project');
    }
    return membership;
  }

  private requireManageRole(membership: ProjectMember, action: string) {
    if (!TICKET_MANAGE_ROLES.includes(membership.role)) {
      throw new ForbiddenException(
        `Only the project LEAD or CONTRIBUTOR can ${action} tickets`,
      );
    }
  }

  private async assertSprintBelongsToProject(
    projectId: string,
    sprintId: string,
  ) {
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId, projectId },
    });
    if (!sprint) {
      throw new NotFoundException('Sprint not found in this project');
    }
  }

  async createTicket(
    projectId: string,
    sprintId: string,
    currentUserId: string,
    data: CreateTicketDto,
  ) {
    const membership = await this.requireMembership(projectId, currentUserId);
    this.requireManageRole(membership, 'create');
    await this.assertSprintBelongsToProject(projectId, sprintId);

    // Whoever creates the ticket is also its initial assignee; reassignment
    // happens later through the update API.
    return this.ticketRepository.save({
      ...data,
      projectId,
      sprintId,
      createdBy: currentUserId,
      assigneeId: currentUserId,
    });
  }

  async getTicketsForSprint(
    projectId: string,
    sprintId: string,
    currentUserId: string,
  ) {
    await this.requireMembership(projectId, currentUserId);
    await this.assertSprintBelongsToProject(projectId, sprintId);
    return this.ticketRepository.find({ where: { projectId, sprintId } });
  }

  async getTicketById(
    projectId: string,
    sprintId: string,
    ticketId: string,
    currentUserId: string,
  ) {
    await this.requireMembership(projectId, currentUserId);

    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, projectId, sprintId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async updateTicket(
    projectId: string,
    sprintId: string,
    ticketId: string,
    currentUserId: string,
    data: UpdateTicketDto,
  ) {
    const membership = await this.requireMembership(projectId, currentUserId);
    this.requireManageRole(membership, 'update');

    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, projectId, sprintId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (data.sprintId) {
      await this.assertSprintBelongsToProject(projectId, data.sprintId);
    }

    // `data` is an UpdateTicketDto class instance: every declared-but-omitted
    // optional field exists as an own property with value `undefined` (ES
    // class-field semantics), so a plain Object.assign would wipe out the
    // ticket's real values for any field the caller didn't send.
    const providedFields = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
    Object.assign(ticket, providedFields);

    return this.ticketRepository.save(ticket);
  }

  async deleteTicket(
    projectId: string,
    sprintId: string,
    ticketId: string,
    currentUserId: string,
  ) {
    const membership = await this.requireMembership(projectId, currentUserId);
    this.requireManageRole(membership, 'delete');

    const result = await this.ticketRepository.delete({
      id: ticketId,
      projectId,
      sprintId,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Ticket not found');
    }
  }
}
