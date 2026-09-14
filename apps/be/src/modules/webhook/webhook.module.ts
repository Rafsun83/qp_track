import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../apiKey/api-key.module.js';
import { SurveyResponseModule } from '../survey_response/survey_response.module.js';
import { WebhookController } from './controller/webhook.controller.js';

@Module({
  imports: [ApiKeyModule, SurveyResponseModule],
  controllers: [WebhookController],
})
export class WebhookModules {}
