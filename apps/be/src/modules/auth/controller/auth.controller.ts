import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateUserDto } from '../../users/dto/create-user.dto.js';
import { UserService } from '../../users/service/user.service.js';
import { Public } from '../decorator/decorator.custom.js';
import { LoginDto } from '../dto/login.dto.js';
import { AuthService } from '../service/auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.signIn(loginDto.username, loginDto.password);
  }

  @Public()
  @Post('/register')
  create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }
}
