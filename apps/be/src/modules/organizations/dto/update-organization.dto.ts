import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiProperty({ example: 'Acme Inc', description: 'Organization name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
