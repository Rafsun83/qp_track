import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SprintPlanStatus } from '../enum/sprint.enum.js';

export class CreateSprintDto {
  @ApiProperty({ example: 'Sprint 1', description: 'Sprint name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '2026-01-05T00:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-01-19T00:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiProperty({
    enum: SprintPlanStatus,
    required: false,
    description: 'Defaults to PLANNED if omitted',
  })
  @IsOptional()
  @IsEnum(SprintPlanStatus)
  status?: SprintPlanStatus;
}
