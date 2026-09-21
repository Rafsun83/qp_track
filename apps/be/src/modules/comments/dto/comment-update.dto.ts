import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({ example: 'Reproduced this on staging too.' })
  @IsNotEmpty()
  @IsString()
  comment: string;
}
