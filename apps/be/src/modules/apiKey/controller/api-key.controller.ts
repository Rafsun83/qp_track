import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { AuthGuard } from '../../auth/guard/auth.guard.js';
import { ApiKeyService } from '../service/api-key.service.js';

@UseInterceptors(ResponseInterceptor)
@Controller('api-key')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @ResponseMessage('API key created successfully')
  @UseGuards(AuthGuard)
  @Post()
  async createApiKey(
    @Req() req: Request & { user: { sub: string } },
    @Body('label') label?: string,
  ) {
    return this.apiKeyService.generateApiKey(req.user.sub, label);
  }

  @ResponseMessage('Latest API key fetched successfully')
  @UseGuards(AuthGuard)
  @Get('latest')
  async getLatest(@Req() req: Request & { user: { sub: string } }) {
    return this.apiKeyService.getLatestApiKey(req.user.sub);
  }

  @ResponseMessage('API key revoked successfully')
  @UseGuards(AuthGuard)
  @Delete('delete')
  async revoke(@Req() req: Request & { user: { sub: string } }) {
    return this.apiKeyService.revokeApiKey(req.user.sub);
  }
}
