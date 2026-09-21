import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '../project_members/entity/project-member.entity.js';
import { Ticket } from '../tickets/entity/ticket.entity.js';
import { CommentController } from './controller/comment.controller.js';
import { Comment } from './entity/comment.entity.js';
import { CommentService } from './service/comment.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, ProjectMember, Ticket])],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentsModule {}
