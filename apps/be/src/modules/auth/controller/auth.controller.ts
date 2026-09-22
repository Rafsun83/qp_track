import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { CreateUserDto } from '../../users/dto/create-user.dto.js';
import { UserService } from '../../users/service/user.service.js';
import { Public } from '../decorator/decorator.custom.js';
import { LoginDto } from '../dto/login.dto.js';
import { AuthService } from '../service/auth.service.js';

@ApiTags('Authentication')
@ApiBearerAuth()
@UseInterceptors(ResponseInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @ResponseMessage('Login successful')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'SignIn a systems' })
  @ApiResponse({ status: 201, description: 'System sign-in' })
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.signIn(loginDto.username, loginDto.password);
  }

  @ResponseMessage('User registered successfully')
  @Public()
  @Post('/register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered in a system' })
  create(@Body() data: CreateUserDto) {
    return this.userService.create(data);
  }
}
