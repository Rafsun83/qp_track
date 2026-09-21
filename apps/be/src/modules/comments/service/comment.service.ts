import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../../project_members/entity/project-member.entity.js';
import { Ticket } from '../../tickets/entity/ticket.entity.js';
import { CreateCommentDto } from '../dto/comment-create.dto.js';
import { UpdateCommentDto } from '../dto/comment-update.dto.js';
import { Comment } from '../entity/comment.entity.js';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,

    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
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

  private async assertTicketInScope(
    projectId: string,
    sprintId: string,
    ticketId: string,
  ) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, projectId, sprintId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
  }

  async createComment(
    projectId: string,
    sprintId: string,
    ticketId: string,
    currentUserId: string,
    data: CreateCommentDto,
  ) {
    await this.requireMembership(projectId, currentUserId);
    await this.assertTicketInScope(projectId, sprintId, ticketId);

    return this.commentRepository.save({
      ...data,
      ticketId,
      userId: currentUserId,
    });
  }

  async getCommentsForTicket(
    projectId: string,
    sprintId: string,
    ticketId: string,
    currentUserId: string,
  ) {
    await this.requireMembership(projectId, currentUserId);
    await this.assertTicketInScope(projectId, sprintId, ticketId);

    return this.commentRepository.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
  }

  async getCommentById(
    projectId: string,
    sprintId: string,
    ticketId: string,
    commentId: string,
    currentUserId: string,
  ) {
    await this.requireMembership(projectId, currentUserId);
    await this.assertTicketInScope(projectId, sprintId, ticketId);

    const comment = await this.commentRepository.findOne({
      where: { id: commentId, ticketId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  async updateComment(
    projectId: string,
    sprintId: string,
    ticketId: string,
    commentId: string,
    currentUserId: string,
    data: UpdateCommentDto,
  ) {
    await this.requireMembership(projectId, currentUserId);
    await this.assertTicketInScope(projectId, sprintId, ticketId);

    const comment = await this.commentRepository.findOne({
      where: { id: commentId, ticketId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== currentUserId) {
      throw new ForbiddenException('Only the comment author can update this comment');
    }

    // `data` is an UpdateCommentDto class instance - filter out undefined
    // own properties before merging (see ticket.service.ts for why a bare
    // Object.assign can silently wipe fields that weren't sent).
    const providedFields = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
    Object.assign(comment, providedFields);

    return this.commentRepository.save(comment);
  }

  async deleteComment(
    projectId: string,
    sprintId: string,
    ticketId: string,
    commentId: string,
    currentUserId: string,
  ) {
    await this.requireMembership(projectId, currentUserId);
    await this.assertTicketInScope(projectId, sprintId, ticketId);

    const comment = await this.commentRepository.findOne({
      where: { id: commentId, ticketId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== currentUserId) {
      throw new ForbiddenException('Only the comment author can delete this comment');
    }

    await this.commentRepository.delete({ id: commentId, ticketId });
  }
}
