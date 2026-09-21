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
import { CreateSprintDto } from '../dto/sprint-create.dto.js';
import { UpdateSprintDto } from '../dto/sprint-update.dto.js';
import { SprintService } from '../service/sprint.service.js';

@Controller('api')
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Post('project/:projectId/sprint')
  createSprint(
    @Param('projectId') projectId: string,
    @Body() sprintInformation: CreateSprintDto,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.sprintService.createSprint(
      projectId,
      currentUser.sub,
      sprintInformation,
    );
  }

  @Get('project/:projectId/sprint')
  getSprintsForProject(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.sprintService.getSprintsForProject(projectId, currentUser.sub);
  }

  @Get('project/:projectId/sprint/:sprintId')
  getSprintById(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.sprintService.getSprintById(
      projectId,
      sprintId,
      currentUser.sub,
    );
  }

  @Put('project/:projectId/sprint/:sprintId')
  updateSprint(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() data: UpdateSprintDto,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.sprintService.updateSprint(
      projectId,
      sprintId,
      currentUser.sub,
      data,
    );
  }

  @Delete('project/:projectId/sprint/:sprintId')
  deleteSprint(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.sprintService.deleteSprint(
      projectId,
      sprintId,
      currentUser.sub,
    );
  }
}
