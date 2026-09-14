import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../../auth/guard/auth.guard.js';
import { ApiKeyService } from '../service/api-key.service.js';

@Controller('api-key')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @UseGuards(AuthGuard)
  @Post()
  async createApiKey(
    @Req() req: Request & { user: { sub: string } },
    @Body('label') label?: string,
  ) {
    return this.apiKeyService.generateApiKey(req.user.sub, label);
  }

  @UseGuards(AuthGuard)
  @Delete('delete')
  async revoke(@Req() req: Request & { user: { sub: string } }) {
    return this.apiKeyService.revokeApiKey(req.user.sub);
  }
}
