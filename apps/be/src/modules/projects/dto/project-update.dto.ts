import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectStatus } from '../enum/project-status.enum.js';

export class UpdateProjectDto {
  @ApiProperty({ example: 'Website Redesign', description: 'Project name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Revamp the marketing website',
    description: 'Project description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'WEB', description: 'Project key' })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiProperty({ enum: ProjectStatus, description: 'Project status' })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
