import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyResponseController } from './controller/survey_response.controller.js';
import { SurveyResponse } from './entity/survey_response.entity.js';
import { SurveyResponseService } from './service/survey_response.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyResponse])],
  controllers: [SurveyResponseController],
  providers: [SurveyResponseService],
  exports: [SurveyResponseService],
})
export class SurveyResponseModule {}
