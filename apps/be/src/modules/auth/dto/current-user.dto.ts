import { IsString } from 'class-validator';

export class CurrentUserDto {
  @IsString()
  sub: string;

  @IsString()
  username: string;
}
