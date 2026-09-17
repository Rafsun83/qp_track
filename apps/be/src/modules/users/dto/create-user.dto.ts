import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Rafsun jani', description: 'User name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'rafsun774@gmail.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'rafsun83', description: 'User userName' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ example: 'Dhaka', description: 'User location' })
  @IsString()
  location: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @MinLength(8)
  password: string;
}
