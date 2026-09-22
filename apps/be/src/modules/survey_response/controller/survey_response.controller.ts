import { Controller, Get, Req, UseInterceptors } from '@nestjs/common';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor.js';
import { SurveyResponseService } from '../service/survey_response.service.js';

@UseInterceptors(ResponseInterceptor)
@Controller('api')
export class SurveyResponseController {
  constructor(private readonly surveyResponseService: SurveyResponseService) {}

  @ResponseMessage('Survey responses fetched successfully')
  @Get('/survey-response')
  findAll(
    @Req() req: Request & { user: { sub: string } },
    // @Query() query: any,
  ) {
    return this.surveyResponseService.findAll(req.user.sub);
  }
}
