import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { CurrentUser } from '../../auth/decorator/current-user.decorator.js';
import { CurrentUserDto } from '../../auth/dto/current-user.dto.js';
import { CreateTicketDto } from '../dto/ticket-create.dto.js';
import { UpdateTicketDto } from '../dto/ticket-update.dto.js';
import { TicketService } from '../service/ticket.service.js';

@UseInterceptors(ResponseInterceptor)
@Controller('api')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @ResponseMessage('Ticket created successfully')
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

  @ResponseMessage('Tickets fetched successfully')
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

  @ResponseMessage('Ticket fetched successfully')
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

  @ResponseMessage('Ticket updated successfully')
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

  @ResponseMessage('Ticket deleted successfully')
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
