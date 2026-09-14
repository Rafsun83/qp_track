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

  async findAll(query: any): Promise<SurveyResponse[]> {
    const qb =
      this.surveyResponseRepository.createQueryBuilder('surveyResponse');

    if (query.userId) {
      qb.andWhere('surveyResponse.userId = :userId', { userId: query.userId });
    }

    return qb.getMany();
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
