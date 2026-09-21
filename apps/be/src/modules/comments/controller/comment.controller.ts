import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorator/current-user.decorator.js';
import { CurrentUserDto } from '../../auth/dto/current-user.dto.js';
import { CreateCommentDto } from '../dto/comment-create.dto.js';
import { UpdateCommentDto } from '../dto/comment-update.dto.js';
import { CommentService } from '../service/comment.service.js';

const TICKET_COMMENT_PATH =
  'project/:projectId/sprint/:sprintId/ticket/:ticketId/comment';

@Controller('api')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post(TICKET_COMMENT_PATH)
  createComment(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('ticketId') ticketId: string,
    @Body() data: CreateCommentDto,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.commentService.createComment(
      projectId,
      sprintId,
      ticketId,
      currentUser.sub,
      data,
    );
  }

  @Get(TICKET_COMMENT_PATH)
  getCommentsForTicket(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('ticketId') ticketId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.commentService.getCommentsForTicket(
      projectId,
      sprintId,
      ticketId,
      currentUser.sub,
    );
  }

  @Get(`${TICKET_COMMENT_PATH}/:commentId`)
  getCommentById(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('ticketId') ticketId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.commentService.getCommentById(
      projectId,
      sprintId,
      ticketId,
      commentId,
      currentUser.sub,
    );
  }

  @Put(`${TICKET_COMMENT_PATH}/:commentId`)
  updateComment(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('ticketId') ticketId: string,
    @Param('commentId') commentId: string,
    @Body() data: UpdateCommentDto,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.commentService.updateComment(
      projectId,
      sprintId,
      ticketId,
      commentId,
      currentUser.sub,
      data,
    );
  }

  @Delete(`${TICKET_COMMENT_PATH}/:commentId`)
  deleteComment(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('ticketId') ticketId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.commentService.deleteComment(
      projectId,
      sprintId,
      ticketId,
      commentId,
      currentUser.sub,
    );
  }
}
