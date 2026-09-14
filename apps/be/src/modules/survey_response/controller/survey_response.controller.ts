import { Controller, Get, Query } from '@nestjs/common';
import { SurveyResponseService } from '../service/survey_response.service.js';

@Controller('api')
export class SurveyResponseController {
  constructor(private readonly surveyResponseService: SurveyResponseService) {}

  @Get('/survey-response')
  findAll(@Query() query: any) {
    return this.surveyResponseService.findAll(query);
  }
}
