import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../../apiKey/guard/api-key.guard.js';
import { Public } from '../../auth/decorator/decorator.custom.js';

@Controller('/webhook')
export class WebhookController {
  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('/response')
  handleResponse(@Body() data: unknown) {
    console.log('Webhook received:', data);
    return data;
  }
}
