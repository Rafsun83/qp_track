import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { ApiKeyGuard } from '../../apiKey/guard/api-key.guard.js';
import { Public } from '../../auth/decorator/decorator.custom.js';
import { SurveyResponseService } from '../../survey_response/service/survey_response.service.js';

@UseInterceptors(ResponseInterceptor)
@Controller('/webhook')
export class WebhookController {
  constructor(private readonly surveyResponseService: SurveyResponseService) {}

  @ResponseMessage('Webhook received successfully')
  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('/response')
  async handleResponse(
    @Req() request: Request & { userId: string },
    @Body() data: any,
  ) {
    await this.surveyResponseService.createSurveyResponse(request.userId, data);
    return { status: 'ok' };
  }

  @ResponseMessage('Webhook test received successfully')
  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('/response/test')
  async handleTestWebhook(
    @Req() request: Request & { userId: string },
    @Body() data: any,
  ) {
    return {
      status: 'ok',
      userId: request.userId,
      responseData: data,
    };
  }
}
