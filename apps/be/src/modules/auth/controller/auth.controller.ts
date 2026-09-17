import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/create-user.dto.js';
import { UserService } from '../../users/service/user.service.js';
import { Public } from '../decorator/decorator.custom.js';
import { LoginDto } from '../dto/login.dto.js';
import { AuthService } from '../service/auth.service.js';

@ApiTags('Authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'SignIn a systems' })
  @ApiResponse({ status: 201, description: 'System sign-in' })
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.signIn(loginDto.username, loginDto.password);
  }

  @Public()
  @Post('/register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered in a system' })
  create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }
}
