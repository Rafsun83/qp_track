import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SurveyResponse } from '../entity/survey_response.entity.js';

@Injectable()
export class SurveyResponseService {
  constructor(
    @InjectRepository(SurveyResponse)
    private surveyResponseRepository: Repository<SurveyResponse>,
  ) {}

  async findAll(userId: string) {
    const responses = this.surveyResponseRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return responses;
  }

  async createSurveyResponse(
    userId: string,
    responseData: Record<string, any>,
  ) {
    const surveyResponse = this.surveyResponseRepository.create({
      userId,
      responseData,
    });

    return this.surveyResponseRepository.save(surveyResponse);
  }
}
