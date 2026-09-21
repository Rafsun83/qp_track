import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Reproduced this on staging too.' })
  @IsNotEmpty()
  @IsString()
  comment: string;
}
