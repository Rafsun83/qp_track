import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '../project_members/entity/project-member.entity.js';
import { Sprint } from '../sprint/entity/sprint.entity.js';
import { TicketController } from './controller/ticket.controller.js';
import { Ticket } from './entity/ticket.entity.js';
import { TicketService } from './service/ticket.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, ProjectMember, Sprint])],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketsModule {}
