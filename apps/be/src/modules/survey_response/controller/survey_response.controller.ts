import { Controller, Get, Req } from '@nestjs/common';
import { SurveyResponseService } from '../service/survey_response.service.js';

@Controller('api')
export class SurveyResponseController {
  constructor(private readonly surveyResponseService: SurveyResponseService) {}

  @Get('/survey-response')
  findAll(
    @Req() req: Request & { user: { sub: string } },
    // @Query() query: any,
  ) {
    return this.surveyResponseService.findAll(req.user.sub);
  }
}
