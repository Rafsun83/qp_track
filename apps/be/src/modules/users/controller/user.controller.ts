import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { CurrentUser } from '../../auth/decorator/current-user.decorator.js';
import { CurrentUserDto } from '../../auth/dto/current-user.dto.js';
import { FindUsersQueryDto } from '../dto/find-users-query.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UserService } from '../service/user.service.js';

@UseInterceptors(ResponseInterceptor)
@Controller('api')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ResponseMessage('Users fetched successfully')
  @Get('users')
  findAll(@Query() query: FindUsersQueryDto) {
    return this.userService.findAll(query);
  }

  @ResponseMessage('Current user fetched successfully')
  @Get('users/me')
  findOne(@CurrentUser() user: CurrentUserDto) {
    return this.userService.findOne(user.sub);
  }

  // @Roles(OrganizationRole.OWNER)
  @ResponseMessage('User fetched successfully')
  @Get('users/:id')
  findOneById(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @ResponseMessage('User updated successfully')
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

  @ResponseMessage('User deleted successfully')
  @Delete('users/:id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
