import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { TicketPriorityEnum } from '../enum/ticket-priority.enum.js';
import { TicketStatus } from '../enum/ticket-status.enum.js';

export class CreateTicketDto {
  @ApiProperty({ example: 'Fix login redirect loop' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Users get bounced back to /login after SSO' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    enum: TicketStatus,
    required: false,
    description: 'Defaults to TODO if omitted',
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({
    enum: TicketPriorityEnum,
    required: false,
    description: 'Defaults to LOW if omitted',
  })
  @IsOptional()
  @IsEnum(TicketPriorityEnum)
  priority?: TicketPriorityEnum;

  @ApiProperty({
    required: false,
    example: { browser: 'Chrome', os: 'macOS', environment: 'staging' },
    description: 'Free-form context captured from the reporting client',
  })
  @IsOptional()
  @IsObject()
  metaData?: Record<string, any>;
}
