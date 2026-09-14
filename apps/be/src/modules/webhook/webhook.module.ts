import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../apiKey/api-key.module.js';
import { WebhookController } from './controller/webhook.controller.js';

@Module({
  imports: [ApiKeyModule],
  controllers: [WebhookController],
})
export class WebhookModules {}
