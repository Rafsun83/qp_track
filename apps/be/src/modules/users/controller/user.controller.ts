import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorator/current-user.decorator.js';
import { CurrentUserDto } from '../../auth/dto/current-user.dto.js';
import { FindUsersQueryDto } from '../dto/find-users-query.dto.js';
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
}
