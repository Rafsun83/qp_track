import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorator/current-user.decorator.js';
import { CurrentUserDto } from '../../auth/dto/current-user.dto.js';
import { FindUsersQueryDto } from '../dto/find-users-query.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UserService } from '../service/user.service.js';

@Controller('api')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('users')
  findAll(@Query() query: FindUsersQueryDto) {
    return this.userService.findAll(query);
  }

  @Get('users/me')
  findOne(@CurrentUser() user: CurrentUserDto) {
    return this.userService.findOne(user.sub);
  }

  // @Roles(OrganizationRole.OWNER)
  @Get('users/:id')
  findOneById(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch('users/:id')
  update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() data: UpdateUserDto,
  ) {
    if (user.sub !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.userService.update(id, data);
  }

  @Delete('users/:id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
