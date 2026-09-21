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
import { CreateTicketDto } from '../dto/ticket-create.dto.js';
import { UpdateTicketDto } from '../dto/ticket-update.dto.js';
import { TicketService } from '../service/ticket.service.js';

@Controller('api')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post('project/:projectId/sprint/:sprintId/ticket')
  createTicket(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() ticketInformation: CreateTicketDto,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.ticketService.createTicket(
      projectId,
      sprintId,
      currentUser.sub,
      ticketInformation,
    );
  }

  @Get('project/:projectId/sprint/:sprintId/ticket')
  getTicketsForSprint(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.ticketService.getTicketsForSprint(
      projectId,
      sprintId,
      currentUser.sub,
    );
  }

  @Get('project/:projectId/sprint/:sprintId/ticket/:ticketId')
  getTicketById(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('ticketId') ticketId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.ticketService.getTicketById(
      projectId,
      sprintId,
      ticketId,
      currentUser.sub,
    );
  }

  @Put('project/:projectId/sprint/:sprintId/ticket/:ticketId')
  updateTicket(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('ticketId') ticketId: string,
    @Body() data: UpdateTicketDto,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.ticketService.updateTicket(
      projectId,
      sprintId,
      ticketId,
      currentUser.sub,
      data,
    );
  }

  @Delete('project/:projectId/sprint/:sprintId/ticket/:ticketId')
  deleteTicket(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('ticketId') ticketId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.ticketService.deleteTicket(
      projectId,
      sprintId,
      ticketId,
      currentUser.sub,
    );
  }
}
