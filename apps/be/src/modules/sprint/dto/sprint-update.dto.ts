import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { SprintPlanStatus } from '../enum/sprint.enum.js';

export class UpdateSprintDto {
  @ApiProperty({ example: 'Sprint 1', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '2026-01-05T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2026-01-19T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ enum: SprintPlanStatus, required: false })
  @IsOptional()
  @IsEnum(SprintPlanStatus)
  status?: SprintPlanStatus;
}
