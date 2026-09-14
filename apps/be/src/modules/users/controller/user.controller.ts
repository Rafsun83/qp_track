import { Controller, Get, Param, Query } from '@nestjs/common';
import { FindUsersQueryDto } from '../dto/find-users-query.dto.js';
import { UserService } from '../service/user.service.js';

@Controller('api')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/users')
  findAll(@Query() query: FindUsersQueryDto) {
    return this.userService.findAll(query);
  }

  @Get('/users/:id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
