import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TicketPriorityEnum } from '../enum/ticket-priority.enum.js';
import { TicketStatus } from '../enum/ticket-status.enum.js';

export class UpdateTicketDto {
  @ApiProperty({ example: 'Fix login redirect loop', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'Users get bounced back to /login after SSO',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
    description: 'Move the ticket to a different sprint within the same project',
  })
  @IsOptional()
  @IsUUID()
  sprintId?: string;

  @ApiProperty({ enum: TicketStatus, required: false })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({ enum: TicketPriorityEnum, required: false })
  @IsOptional()
  @IsEnum(TicketPriorityEnum)
  priority?: TicketPriorityEnum;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Reassign the ticket to a different user',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @ApiProperty({
    required: false,
    example: { browser: 'Chrome', os: 'macOS', environment: 'staging' },
  })
  @IsOptional()
  @IsObject()
  metaData?: Record<string, any>;
}
