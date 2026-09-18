import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'Dhaka', description: 'User location' })
  @IsString()
  @IsNotEmpty()
  location: string;
}
