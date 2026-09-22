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
import { CreateSprintDto } from '../dto/sprint-create.dto.js';
import { UpdateSprintDto } from '../dto/sprint-update.dto.js';
import { SprintService } from '../service/sprint.service.js';

@UseInterceptors(ResponseInterceptor)
@Controller('api')
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @ResponseMessage('Sprint created successfully')
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

  @ResponseMessage('Sprints fetched successfully')
  @Get('project/:projectId/sprint')
  getSprintsForProject(
    @Param('projectId') projectId: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.sprintService.getSprintsForProject(projectId, currentUser.sub);
  }

  @ResponseMessage('Sprint fetched successfully')
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

  @ResponseMessage('Sprint updated successfully')
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

  @ResponseMessage('Sprint deleted successfully')
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
